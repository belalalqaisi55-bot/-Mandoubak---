#!/usr/bin/env bash
# ==============================================================================
# سكريبت بناء تطبيق مندوبك الطبي (APK) باستخدام Capacitor و Gradle
# ==============================================================================
set -e

echo "🚀 [1/5] التحقق من بيئة العمل وتثبيت حزم المشروع..."
npm install

echo "📦 [2/5] تثبيت حزم Capacitor الأساسية للأندرويد..."
npm install @capacitor/core @capacitor/cli @capacitor/android

echo "🛠️ [3/5] بناء أصول الويب وتجميع المشروع..."
npm run build

echo "🤖 [4/5] تهيئة ومزامنة مجلد الأندرويد..."
# إذا لم يكن مجلد الأندرويد موجوداً نقوم بإضافته
if [ ! -d "android" ]; then
  echo "إنشاء مجلد Android عبر npx cap add android..."
  npx cap add android
fi

# مزامنة الأصول وتحديث إعدادات الأندرويد
echo "مزامنة أصول التطبيق عبر npx cap sync android..."
npx cap sync android

echo "🔨 [5/5] تجميع وترجمة ملف APK..."
chmod +x android/gradlew
cd android
./gradlew assembleDebug --no-daemon --stacktrace
cd ..

echo "=============================================================================="
echo "✅ تم بناء ملف APK بنجاح!"
echo "📁 مسار الملف الناتج:"
echo "👉 android/app/build/outputs/apk/debug/app-debug.apk"
echo "=============================================================================="
