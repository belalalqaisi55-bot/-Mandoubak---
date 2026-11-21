#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ANDROID_DIR="$ROOT_DIR/android"
APP_GRADLE="$ANDROID_DIR/app/build.gradle"
STRINGS_XML="$ANDROID_DIR/app/src/main/res/values/strings.xml"
KEYSTORE_PROPS="$ANDROID_DIR/keystore.properties"

NEW_VERSION_NAME=""
PUBLISH_GITHUB_RELEASE="${PUBLISH_GITHUB_RELEASE:-auto}"

for arg in "$@"; do
  case "$arg" in
    --publish)
      PUBLISH_GITHUB_RELEASE="true"
      ;;
    --no-publish)
      PUBLISH_GITHUB_RELEASE="false"
      ;;
    -*)
      echo "خطأ: خيار غير معروف: $arg"
      echo "الاستخدام: $0 [versionName] [--publish | --no-publish]"
      exit 1
      ;;
    *)
      if [ -z "$NEW_VERSION_NAME" ]; then
        NEW_VERSION_NAME="$arg"
      fi
      ;;
  esac
done

if [ ! -f "$APP_GRADLE" ]; then
  echo "خطأ: لم يتم العثور على الملف $APP_GRADLE"
  exit 1
fi

if [ ! -f "$KEYSTORE_PROPS" ]; then
  echo "خطأ: لم يتم العثور على ملف التوقيع $KEYSTORE_PROPS"
  echo "يرجى نسخ android/keystore.properties.example إلى android/keystore.properties وإدخال بيانات المفتاح أولاً."
  exit 1
fi

if grep -qE "YOUR_KEYSTORE_PASSWORD|YOUR_KEY_PASSWORD" "$KEYSTORE_PROPS"; then
  echo "خطأ: ملف $KEYSTORE_PROPS ما زال يحتوي على قيم افتراضية (YOUR_KEYSTORE_PASSWORD / YOUR_KEY_PASSWORD)."
  echo "يرجى استبدالها بكلمات المرور الحقيقية لملف Keystore."
  exit 1
fi

if ! command -v java >/dev/null 2>&1; then
  echo "خطأ: حزمة Java JDK غير مثبتة في هذه البيئة؛ لا يمكن تشغيل Gradle محلياً."
  exit 1
fi

CURRENT_CODE=$(grep -E 'versionCode[[:space:]]+[0-9]+' "$APP_GRADLE" | head -n 1 | awk '{print $2}')
CURRENT_NAME=$(grep -E 'versionName[[:space:]]+"[^"]+"' "$APP_GRADLE" | head -n 1 | sed -E 's/.*"([^"]+)".*/\1/')
APP_ID=$(grep -E 'applicationId[[:space:]]+"[^"]+"' "$APP_GRADLE" | head -n 1 | sed -E 's/.*"([^"]+)".*/\1/')
APP_ID="${APP_ID:-com.mandoubak.app}"

if [ -z "$CURRENT_CODE" ] || [ -z "$CURRENT_NAME" ]; then
  echo "خطأ: تعذر قراءة versionCode أو versionName من $APP_GRADLE"
  exit 1
fi

NEXT_CODE=$((CURRENT_CODE + 1))
NEXT_NAME="${NEW_VERSION_NAME:-$CURRENT_NAME}"
BUILD_DATE="$(date '+%Y-%m-%d %H:%M')"
RELEASE_TAG="v${NEXT_NAME}-c${NEXT_CODE}"
RELEASE_TITLE="مندوبك الطبي v${NEXT_NAME} (Build ${NEXT_CODE})"

echo "تحديث الإصدار: versionCode ($CURRENT_CODE -> $NEXT_CODE) | versionName ($CURRENT_NAME -> $NEXT_NAME)"

sed -i.bak -E "s/(versionCode[[:space:]]+)[0-9]+/\1${NEXT_CODE}/" "$APP_GRADLE"
sed -i.bak -E "s/(versionName[[:space:]]+\")[^\"]+(\")/\1${NEXT_NAME}\2/" "$APP_GRADLE"
rm -f "${APP_GRADLE}.bak"

if [ -f "$STRINGS_XML" ] && grep -q 'name="app_version_name"' "$STRINGS_XML"; then
  sed -i.bak -E "s|(<string name=\"app_version_name\">)[^<]*(</string>)|\1${NEXT_NAME}\2|" "$STRINGS_XML"
  rm -f "${STRINGS_XML}.bak"
fi

echo "1/6 بناء حزمة الويب..."
cd "$ROOT_DIR"
npm run build

echo "2/6 مزامنة المشروع مع Capacitor Android..."
npx cap sync android

echo "3/6 بناء حزم APK و AAB الموقّعة (Release)..."
cd "$ANDROID_DIR"
chmod +x ./gradlew
./gradlew clean assembleRelease bundleRelease

APK_SRC="$ANDROID_DIR/app/build/outputs/apk/release/app-release.apk"
AAB_SRC="$ANDROID_DIR/app/build/outputs/bundle/release/app-release.aab"

OUT_DIR="$ROOT_DIR/releases/mandoubak-med-v${NEXT_NAME}-c${NEXT_CODE}"
mkdir -p "$OUT_DIR"

APK_NAME="mandoubak-med-v${NEXT_NAME}-c${NEXT_CODE}.apk"
AAB_NAME="mandoubak-med-v${NEXT_NAME}-c${NEXT_CODE}.aab"
NOTES_FILE="$OUT_DIR/RELEASE_NOTES.md"
CHECKSUMS_FILE="$OUT_DIR/SHA256SUMS.txt"

APK_DEST="$OUT_DIR/$APK_NAME"
AAB_DEST="$OUT_DIR/$AAB_NAME"

if [ ! -f "$APK_SRC" ] || [ ! -f "$AAB_SRC" ]; then
  echo "خطأ: لم يتم العثور على مخرجات البناء المتوقعة في مجلد outputs."
  exit 1
fi

cp "$APK_SRC" "$APK_DEST"
cp "$AAB_SRC" "$AAB_DEST"

echo "4/6 توليد ملاحظات الإصدار RELEASE_NOTES.md..."
cd "$ROOT_DIR"

COMMITS_LIST=""
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || true)
  if [ -n "$LAST_TAG" ]; then
    COMMITS_LIST=$(git log "${LAST_TAG}..HEAD" --pretty=format:"- %s (%h)" 2>/dev/null || true)
  fi
  if [ -z "$COMMITS_LIST" ]; then
    COMMITS_LIST=$(git log -n 15 --pretty=format:"- %s (%h)" 2>/dev/null || true)
  fi
fi

if [ -z "$COMMITS_LIST" ]; then
  COMMITS_LIST="- تحديثات وتحسينات عامة على الأداء والاستقرار."
fi

cat <<EOF > "$NOTES_FILE"
# ملاحظات إصدار تطبيق مندوبك الطبي (Mandoubak Med)

- **رقم النسخة (versionName):** ${NEXT_NAME}
- **رقم البناء (versionCode):** ${NEXT_CODE}
- **معرّف الحزمة (Application ID):** ${APP_ID}
- **تاريخ البناء:** ${BUILD_DATE}

## أبرز التغييرات والتحسينات
${COMMITS_LIST}

## ملفات الحزم المرفقة
- **حزمة التثبيت (APK):** \`${APK_NAME}\`
- **حزمة المتجر (AAB):** \`${AAB_NAME}\`
EOF

echo "5/6 توليد بصمات التحقق SHA-256..."
cd "$OUT_DIR"
if command -v sha256sum >/dev/null 2>&1; then
  sha256sum "$APK_NAME" "$AAB_NAME" "RELEASE_NOTES.md" > "$CHECKSUMS_FILE"
elif command -v shasum >/dev/null 2>&1; then
  shasum -a 256 "$APK_NAME" "$AAB_NAME" "RELEASE_NOTES.md" > "$CHECKSUMS_FILE"
else
  echo "تنبيه: تعذر العثور على أداة sha256sum أو shasum، تم تخطي توليد بصمات التحقق."
fi

echo "6/6 رفع حزم الإصدار وملاحظات الإصدار إلى GitHub Releases..."
cd "$ROOT_DIR"

UPLOAD_ASSETS=("$APK_DEST" "$AAB_DEST" "$NOTES_FILE")
if [ -f "$CHECKSUMS_FILE" ]; then
  UPLOAD_ASSETS+=("$CHECKSUMS_FILE")
fi

GH_RELEASE_URL=""
if [ "$PUBLISH_GITHUB_RELEASE" = "false" ] || [ "$PUBLISH_GITHUB_RELEASE" = "0" ]; then
  echo "تم تخطي الرفع إلى GitHub Releases بناءً على الخيار المحدد (--no-publish / PUBLISH_GITHUB_RELEASE=false)."
else
  GH_READY="true"
  if ! command -v gh >/dev/null 2>&1; then
    GH_READY="false"
    GH_REASON="أداة GitHub CLI (gh) غير مثبتة."
  elif ! gh auth status >/dev/null 2>&1; then
    GH_READY="false"
    GH_REASON="أداة gh غير مسجلة الدخول (قم بتشغيل: gh auth login أو تعيين GH_TOKEN)."
  elif ! git rev-parse --is-inside-work-tree >/dev/null 2>&1 && [ -z "${GH_REPO:-}" ]; then
    GH_READY="false"
    GH_REASON="المجلد ليس مستودع Git ولم يتم تحديد المتغير GH_REPO."
  fi

  if [ "$GH_READY" = "false" ]; then
    if [ "$PUBLISH_GITHUB_RELEASE" = "true" ] || [ "$PUBLISH_GITHUB_RELEASE" = "1" ]; then
      echo "خطأ: تعذر الرفع إلى GitHub Releases — $GH_REASON"
      exit 1
    else
      echo "تنبيه: تم تخطي الرفع التلقائي إلى GitHub Releases — $GH_REASON"
      echo "يمكنك الرفع لاحقاً عبر:"
      echo "  gh release create \"$RELEASE_TAG\" \"${UPLOAD_ASSETS[*]}\" --title \"$RELEASE_TITLE\" --notes-file \"$NOTES_FILE\""
    fi
  else
    GH_REPO_FLAG=()
    if [ -n "${GH_REPO:-}" ]; then
      GH_REPO_FLAG=(--repo "$GH_REPO")
    fi

    if gh release view "$RELEASE_TAG" "${GH_REPO_FLAG[@]}" >/dev/null 2>&1; then
      echo "تحديث الإصدار الموجود مسبقاً على GitHub ($RELEASE_TAG)..."
      gh release upload "$RELEASE_TAG" "${UPLOAD_ASSETS[@]}" --clobber "${GH_REPO_FLAG[@]}"
      gh release edit "$RELEASE_TAG" --title "$RELEASE_TITLE" --notes-file "$NOTES_FILE" "${GH_REPO_FLAG[@]}"
    else
      echo "إنشاء إصدار جديد على GitHub ($RELEASE_TAG)..."
      TARGET_BRANCH=""
      if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
        TARGET_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || true)
      fi
      TARGET_FLAG=()
      if [ -n "$TARGET_BRANCH" ] && [ "$TARGET_BRANCH" != "HEAD" ]; then
        TARGET_FLAG=(--target "$TARGET_BRANCH")
      fi
      gh release create "$RELEASE_TAG" "${UPLOAD_ASSETS[@]}" \
        --title "$RELEASE_TITLE" \
        --notes-file "$NOTES_FILE" \
        "${TARGET_FLAG[@]}" \
        "${GH_REPO_FLAG[@]}"
    fi

    GH_RELEASE_URL=$(gh release view "$RELEASE_TAG" "${GH_REPO_FLAG[@]}" --json url -q .url 2>/dev/null || true)
  fi
fi

echo ""
echo "تم البناء وتوليد ملاحظات الإصدار بنجاح!"
echo "مسار APK: $APK_DEST"
echo "مسار AAB: $AAB_DEST"
echo "ملاحظات الإصدار: $NOTES_FILE"
if [ -f "$CHECKSUMS_FILE" ]; then
  echo "ملف التدقيق: $CHECKSUMS_FILE"
fi
if [ -n "$GH_RELEASE_URL" ]; then
  echo "رابط الإصدار على GitHub: $GH_RELEASE_URL"
fi
