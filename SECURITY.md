# 🔐 معايير الأمان - Security Guidelines

## إدارة الأسرار وكلمات المرور

- **عدم تخزين أي أسرار أو كلمات مرور في الكود المصدري أو ملفات التوثيق:** يتم ضبط كلمة مرور المسؤول ومفاتيح الجلسات والخدمات عبر متغيرات البيئة الآمنة في الخادم فقط.
- **في بيئات التطوير والنشر (مثل Vercel / Cloud Run):**
  - اضبط `ADMIN_SECRET` لكلمة مرور المسؤول.
  - اضبط `SESSION_SECRET` لتوقيع رموز الجلسة (`HMAC-SHA256`).
  - اضبط مفاتيح API الخاصة بالخدمات الخارجية (`GEMINI_API_KEY`, `OPENROUTER_API_KEY`) في متغيرات البيئة الخادمية فقط دون أي بادئة `VITE_`.
- **تجزئة كلمة المرور عند الإعداد الأولي:** في حال عدم تعيين `ADMIN_SECRET` في متغيرات البيئة، يدعم التطبيق تعيين كلمة مرور المسؤول لأول مرة عبر `/api/auth/claim-admin` وتُحفظ مُجزّأة (`scrypt`) في مجموعة `server_secrets` المعزولة عن القراءة العامة.

## ملفات لا يجب رفعها إلى Git

```
.env
.env.local
google-services.json
firebase-key.json
*-firebase-adminsdk-*.json
secrets.json
```

## قائمة التحقق الأمنية (Checklist)

- [x] إزالة كلمات المرور المكشوفة من الكود والملفات العامة
- [x] تجهيز `.env.example` بدون أسرار حقيقية
- [x] حماية مسارات الإدارة والتحقق من الجلسات الموقّعة (`Bearer`)
- [x] تفعيل قواعد `firestore.rules` لمنع الترقية الذاتية أو الموافقة التلقائية على الحسابات
- [x] عزل أسرار الخادم في `server_secrets` بدلاً من `settings` العامة
- [x] استخدام Firebase Functions v2 للإشعارات السحابية دون الحاجة لمفاتيح Service Account على الخادم الوسيط

## موارد مفيدة

- [Firebase Security Rules](https://firebase.google.com/docs/rules/basics)
- [OWASP Security Checklist](https://owasp.org/)
- [Google Cloud Security](https://cloud.google.com/docs/security)
