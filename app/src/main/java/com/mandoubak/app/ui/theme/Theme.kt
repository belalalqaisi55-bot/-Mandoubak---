package com.mandoubak.app.ui.theme

import android.app.Activity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private val LightColorScheme = lightColorScheme(
    primary = MedicalTeal,
    onPrimary = Color.White,
    primaryContainer = MedicalTealContainer,
    onPrimaryContainer = OnMedicalTealContainer,
    secondary = MedicalGold,
    onSecondary = Color.White,
    secondaryContainer = MedicalGoldContainer,
    onSecondaryContainer = OnMedicalGoldContainer,
    tertiary = ClinicalBlue,
    onTertiary = Color.White,
    tertiaryContainer = ClinicalBlueContainer,
    background = MedicalBackground,
    surface = MedicalSurface,
    surfaceVariant = MedicalSurfaceVariant,
    outline = MedicalOutline
)

private val DarkColorScheme = darkColorScheme(
    primary = Color(0xFF4DD8D8),
    onPrimary = MedicalTealDark,
    primaryContainer = MedicalTeal,
    onPrimaryContainer = MedicalTealContainer,
    secondary = Color(0xFFFBBF24),
    onSecondary = Color(0xFF451A03),
    secondaryContainer = MedicalGold,
    onSecondaryContainer = MedicalGoldContainer,
    background = Color(0xFF0F172A),
    surface = Color(0xFF1E293B),
    surfaceVariant = Color(0xFF334155),
    outline = Color(0xFF475569)
)

@Composable
fun MandoubakTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = colorScheme.primary.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = false
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = AppTypography,
        content = content
    )
}
