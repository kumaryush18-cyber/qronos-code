// English runtime translations for autocomplete (qronos:autocomplete.* namespace)
// Source: src/i18n/locales/en/qronos.json → "autocomplete" section

export const dict = {
  "qronos:autocomplete.statusBar.enabled": "$(qronos-logo) تکمیل خودکار",
  "qronos:autocomplete.statusBar.snoozed": "به تعویق افتاده",
  "qronos:autocomplete.statusBar.warning": "$(warning) تکمیل خودکار",
  "qronos:autocomplete.statusBar.tooltip.basic": "تکمیل خودکار Qronos Code",
  "qronos:autocomplete.statusBar.tooltip.noUsableProvider":
    "**هیچ مدل تکمیل خودکاری پیکربندی نشده است**\n\nبرای فعال‌سازی تکمیل خودکار، یک پروفایل با یکی از ارائه‌دهندگان پشتیبانی‌شده زیر اضافه کنید: {{providers}}.\n\n[باز کردن تنظیمات]({{command}})",
  "qronos:autocomplete.statusBar.tooltip.completionSummary":
    "{{count}} تکمیل بین {{startTime}} و {{endTime}} انجام شد، با هزینه کل {{cost}}.",
  "qronos:autocomplete.statusBar.tooltip.providerInfo":
    "تکمیل خودکار توسط {{model}} از طریق {{provider}} ارائه می‌شود.",
  "qronos:autocomplete.statusBar.cost.zero": "۰.۰۰$",
  "qronos:autocomplete.statusBar.cost.lessThanCent": "<۰.۰۱$",
  "qronos:autocomplete.codeAction.title": "Qronos Code: ویرایش‌های پیشنهادی",
  "qronos:autocomplete.incompatibilityExtensionPopup.message":
    "تکمیل خودکار Qronos Code به دلیل تعارض با GitHub Copilot مسدود شده است. برای رفع این مشکل، باید پیشنهادات درون‌خطی Copilot را غیرفعال کنید.",
  "qronos:autocomplete.incompatibilityExtensionPopup.disableCopilot": "غیرفعال کردن Copilot",
  "qronos:autocomplete.incompatibilityExtensionPopup.disableInlineAssist": "غیرفعال کردن تکمیل خودکار",
  "qronos:autocomplete.creditsExhausted.message":
    "تکمیل خودکار Qronos Code متوقف شده است. دلایل احتمالی: حساب Qronos شما اعتبار کافی ندارد، یا کلید API پیکربندی‌شده (BYOK) به سقف مجاز خود رسیده است. برای از سرگیری تکمیل خودکار، اعتبار Qronos اضافه کنید یا تنظیمات کلید API خود را بررسی کنید.",
  "qronos:autocomplete.creditsExhausted.addCredits": "افزودن اعتبار",
  "qronos:autocomplete.authError.message":
    "تکمیل خودکار Qronos Code به دلیل مشکل احراز هویت متوقف شده است. دلایل احتمالی: وارد Qronos نشده‌اید، یا کلید API (BYOK) شما نامعتبر یا وارد نشده است. لطفاً دوباره وارد شوید یا تنظیمات کلید API ارائه‌دهنده خود را بررسی کنید.",
}
