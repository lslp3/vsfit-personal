# ==========================
# VSFit Personal - ProGuard
# ==========================

# Preserve annotations
-keepattributes *Annotation*

# Preserve generic signatures
-keepattributes Signature

# Preserve line numbers for crash reports
-keepattributes SourceFile,LineNumberTable

# Preserve exceptions
-keepattributes Exceptions

##############################
# Capacitor
##############################

-keep class com.getcapacitor.** { *; }
-dontwarn com.getcapacitor.**

##############################
# AndroidX
##############################

-dontwarn androidx.**

##############################
# Kotlin
##############################

-dontwarn kotlin.**

##############################
# Google
##############################

-dontwarn com.google.**

##############################
# WebView Javascript Interface
##############################

-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

##############################
# Remove logs in release
##############################

-assumenosideeffects class android.util.Log {
    public static *** d(...);
    public static *** v(...);
    public static *** i(...);
}

##############################
# Keep enums
##############################

-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}