/// App-wide configuration.
///
/// The API address is set at build time:
///   flutter run --dart-define=API_URL=https://api.mgkpharmacy.com
/// The default is the API on this computer, reached from a USB phone or an emulator through
/// `adb reverse tcp:4000 tcp:4000` (run it again whenever the device reconnects).
class AppConfig {
  static const apiUrl = String.fromEnvironment('API_URL', defaultValue: 'http://localhost:4000');

  /// Allow the development-only "simulate drive" button for riders.
  static const devTools = bool.fromEnvironment('DEV_TOOLS', defaultValue: true);
}

/// Store identity. Values marked PLACEHOLDER must match the website's lib/site.ts before launch.
class Site {
  static const name = 'MGK Pharmacy';
  static const tagline = 'Genuine medicines, checked by real pharmacists';
  static const addressLine1 = 'Plot 53, Karkasara';
  static const addressLine2 = 'Behind AKTH Exit Gate';
  static const city = 'Kano';
  static const phone = '+234 800 000 0000'; // PLACEHOLDER
  static const phoneUri = 'tel:+2348000000000'; // PLACEHOLDER
  static const whatsapp = 'https://wa.me/2348000000000'; // PLACEHOLDER
  static const email = 'care@example.com'; // PLACEHOLDER
  static const pcnNumber = 'PCN/PR/000000'; // PLACEHOLDER
  static const superintendent = 'Pharm. [Name], MPCN'; // PLACEHOLDER
  static const hours = [
    ('Monday – Saturday', '8:00am – 10:00pm'),
    ('Sunday', '12:00pm – 8:00pm'),
  ];

  /// Same hours as numbers (24h, Nigerian time) for "open now". Keep in sync with [hours]. Key 7 = Sunday (DateTime.weekday).
  static const openingHours = {1: (8, 22), 2: (8, 22), 3: (8, 22), 4: (8, 22), 5: (8, 22), 6: (8, 22), 7: (12, 20)};

  /// Whether the store is open right now in Nigeria (UTC+1, no daylight saving), with a short label.
  static (bool, String) openStatus([DateTime? now]) {
    final wat = (now ?? DateTime.now()).toUtc().add(const Duration(hours: 1));
    final hour = wat.hour + wat.minute / 60;
    final (open, close) = openingHours[wat.weekday]!;
    String label(int h) => '${h % 12 == 0 ? 12 : h % 12}${h < 12 ? 'am' : 'pm'}';
    if (hour >= open && hour < close) return (true, 'Open now · until ${label(close)}');
    if (hour < open) return (false, 'Closed · opens ${label(open)}');
    return (false, 'Closed · opens tomorrow ${label(openingHours[wat.weekday % 7 + 1]!.$1)}');
  }
}
