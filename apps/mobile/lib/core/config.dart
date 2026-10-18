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
}
