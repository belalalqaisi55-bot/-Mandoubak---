# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in the Android SDK's proguard-android-optimize.txt.

# قواعد الحفاظ العامة لبيئة Android و R8
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod

# الحفاظ على فئات Capacitor وإضافاته
-keep class com.getcapacitor.** { *; }
-keep public class * extends com.getcapacitor.Plugin { *; }
-keep public class * extends com.getcapacitor.BridgeActivity
-keepclassmembers class * {
    @com.getcapacitor.PluginMethod <methods>;
}

# الحفاظ على فئات Firebase و Google Play Services
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.android.gms.**

# الحفاظ على واجهات JavaScript إن وُجدت
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# الحفاظ على فئات Parcelable و Serializable عند تمرير البيانات
-keepclassmembers class * implements android.os.Parcelable {
    public static final android.os.Parcelable$Creator CREATOR;
}

-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}
