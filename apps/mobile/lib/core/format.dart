import 'package:intl/intl.dart';

final _naira = NumberFormat.currency(locale: 'en_NG', symbol: '₦', decimalDigits: 0);
final _nairaExact = NumberFormat.currency(locale: 'en_NG', symbol: '₦', decimalDigits: 2);

/// Amounts are held in kobo, like the API.
String naira(num kobo) => kobo % 100 == 0 ? _naira.format(kobo / 100) : _nairaExact.format(kobo / 100);

DateTime _lagos(String iso) => DateTime.parse(iso).toUtc().add(const Duration(hours: 1));

String fmtDate(String? iso) => iso == null ? '' : DateFormat('d MMM yyyy').format(_lagos(iso));
String fmtDateTime(String? iso) => iso == null ? '' : DateFormat('d MMM yyyy, h:mm a').format(_lagos(iso));

String fmtPhone(String? e164) {
  if (e164 == null || e164.isEmpty) return '';
  final local = e164.replaceFirst(RegExp(r'^\+234'), '0');
  final m = RegExp(r'^(\d{4})(\d{3})(\d{4})$').firstMatch(local);
  return m == null ? local : '${m[1]} ${m[2]} ${m[3]}';
}

String plural(int n, String one, [String? many]) => '$n ${n == 1 ? one : (many ?? '${one}s')}';

String ago(String iso) {
  final s = DateTime.now().toUtc().difference(DateTime.parse(iso).toUtc()).inSeconds;
  if (s < 10) return 'just now';
  if (s < 60) return '$s seconds ago';
  return '${(s / 60).round()} min ago';
}

const orderStatusLabel = {
  'AWAITING_RX_REVIEW': 'Prescription review',
  'AWAITING_PAYMENT': 'Awaiting payment',
  'PROCESSING': 'Being prepared',
  'READY_FOR_PICKUP': 'Ready for pickup',
  'DISPATCHED': 'On its way',
  'DELIVERED': 'Delivered',
  'COMPLETED': 'Collected',
  'CANCELLED': 'Cancelled',
};

const paymentStatusLabel = {
  'UNPAID': 'Unpaid',
  'PROOF_SUBMITTED': 'Receipt submitted',
  'PAID': 'Paid',
  'REFUND_PENDING': 'Refund pending',
  'REFUNDED': 'Refunded',
};

const paymentMethodLabel = {
  'PAYSTACK': 'Card / USSD (Paystack)',
  'BANK_TRANSFER': 'Bank transfer',
  'PAY_ON_PICKUP': 'Pay at pickup',
};

const rxLabel = {'OTC': 'Over the counter', 'POM': 'Prescription only', 'CONTROLLED': 'Controlled medicine'};

const idTypeLabel = {
  'NIN': 'National ID (NIN slip or card)',
  'DRIVERS_LICENCE': "Driver's licence",
  'PASSPORT': 'International passport',
  'VOTERS_CARD': "Voter's card",
};

const roleLabel = {
  'ADMIN': 'Administrator',
  'PHARMACIST': 'Pharmacist',
  'SUPPORT': 'Customer support',
  'INVENTORY': 'Inventory manager',
  'RIDER': 'Delivery rider',
  'CUSTOMER': 'Customer',
};

const nigerianStates = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo',
  'Ekiti', 'Enugu', 'FCT - Abuja', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos',
  'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
];
