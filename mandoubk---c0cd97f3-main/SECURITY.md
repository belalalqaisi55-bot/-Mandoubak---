# 🔐 معايير الأمان - Security Guidelines

## البيانات الحساسة التي تم حذفها

### تحذير مهم:
✅ تم حذف كلمة السر `Belal302344` من README.md
✅ تم حذف جميع المفاتيح والأسرار من الملفات العامة

## خطوات الأمان المتخذة:

### 1. تغيير كلمة السر الفورية
**كلمة السر الجديدة:** `Mandoubk302344$`
- ضع هذه الكلمة في متغيرات البيئة فقط
- **لا تضعها أبداً في ملفات Git أو README**

### 2. استخدام متغيرات البيئة
بدلاً من وضع البيانات الحساسة في الملفات:
```bash
# استخدم .env للبيانات الحساسة
firebase functions:config:set app.admin_secret="Mandoubk302344$"
firebase deploy --only functions
```

### 3. ملفات مهمة يجب حذفها من Git History
```
.env
google-services.json
firebase-key.json
secrets.json
```

## قائمة التحقق (Checklist):

- [x] حذف البيانات الحساسة من README
- [x] إنشاء ملف .env.example
- [ ] تحديث Firebase Cloud Functions بكلمة السر الجديدة
- [ ] تفعيل Firebase Authentication بشكل صحيح
- [ ] تحديث قواعد Firestore Rules للإنتاج
- [ ] إزالة البيانات الحساسة من Git History (إذا لزم الأمر)
- [ ] استخدام Secret Management في Firebase

## موارد مفيدة:

- [Firebase Security Best Practices](https://firebase.google.com/docs/rules/basics)
- [OWASP Security Checklist](https://owasp.org/)
- [Google Cloud Security](https://cloud.google.com/docs/security)

---

**آخر تحديث:** 2026-09-07
