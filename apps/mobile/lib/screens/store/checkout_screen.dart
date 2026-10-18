import 'dart:async';

import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';

import '../../core/api.dart';
import '../../core/config.dart';
import '../../core/format.dart';
import '../../core/models.dart';
import '../../core/theme.dart';
import '../../state/auth_state.dart';
import '../../state/cart_state.dart';
import '../../state/store_state.dart';
import '../../widgets/common.dart';
import '../../widgets/files.dart';
import '../../widgets/map_view.dart';
import '../../widgets/ui.dart';
import 'cart_screen.dart';
import 'paystack_screen.dart';

class CheckoutScreen extends StatefulWidget {
  const CheckoutScreen({super.key});
  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  final _first = TextEditingController(), _last = TextEditingController(), _email = TextEditingController(), _phone = TextEditingController();
  final _line1 = TextEditingController(), _line2 = TextEditingController(), _city = TextEditingController(), _landmark = TextEditingController();
  final _notes = TextEditingController(), _rxPatient = TextEditingController(), _rxPrescriber = TextEditingController();
  String _state = 'Kano';
  String _fulfilment = 'DELIVERY';
  String _payment = 'BANK_TRANSFER';
  String _addressId = 'new';
  String _rxChoice = 'new';
  bool _saveAddress = true, _agree = false, _submitting = false, _locating = false, _editContact = false;
  LatLng? _pin;
  PickedFile? _rxFile;
  List<Address> _addresses = [];
  List<Prescription> _prescriptions = [];
  Quote? _quote;
  String? _error;
  Map<String, String> _fields = {};
  Timer? _debounce;

  @override
  void initState() {
    super.initState();
    final user = context.read<AuthState>().user;
    final info = context.read<StoreState>().info;
    if (info?.paystack == true) _payment = 'PAYSTACK';
    if (user != null) {
      _first.text = user.firstName;
      _last.text = user.lastName;
      _email.text = user.email;
      _phone.text = fmtPhone(user.phone);
      _rxPatient.text = user.fullName;
      _loadAccount();
    }
    _requote();
  }

  Future<void> _loadAccount() async {
    try {
      final r = await Future.wait([api.get('/account/addresses'), api.get('/prescriptions')]);
      setState(() {
        _addresses = (r[0]['addresses'] as List).map((a) => Address(a as Json)).toList();
        _prescriptions = (r[1]['prescriptions'] as List).map((p) => Prescription(p as Json)).where((p) => p.status != 'REJECTED' && !p.expired).toList();
        if (_addresses.isNotEmpty) _addressId = (_addresses.where((a) => a.isDefault).firstOrNull ?? _addresses.first).id;
        if (_prescriptions.isNotEmpty) _rxChoice = _prescriptions.first.id;
      });
      _requote();
    } catch (_) {}
  }

  Address? get _selectedAddress => _addresses.where((a) => a.id == _addressId).firstOrNull;
  String? get _deliveryState => _fulfilment == 'DELIVERY' ? (_selectedAddress?.state ?? _state) : null;

  void _requote() {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 200), () async {
      try {
        final q = await fetchQuote(context.read<CartState>(), fulfilment: _fulfilment, state: _deliveryState);
        if (mounted) setState(() => _quote = q);
      } catch (_) {}
    });
  }

  bool get _rxNeedsReview {
    if (_quote?.requiresRx != true) return false;
    final chosen = _prescriptions.where((p) => p.id == _rxChoice).firstOrNull;
    return chosen == null || chosen.status != 'APPROVED';
  }

  Future<void> _useMyLocation() async {
    setState(() => _locating = true);
    try {
      var perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) perm = await Geolocator.requestPermission();
      if (perm == LocationPermission.denied || perm == LocationPermission.deniedForever) throw Exception();
      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.high, timeLimit: Duration(seconds: 15)),
      );
      setState(() => _pin = LatLng(pos.latitude, pos.longitude));
    } catch (_) {
      if (mounted) snack(context, "We couldn't get your location. Check location permissions, or tap the map to drop a pin.", error: true);
    } finally {
      if (mounted) setState(() => _locating = false);
    }
  }

  Future<void> _submit() async {
    final cart = context.read<CartState>();
    final user = context.read<AuthState>().user;
    setState(() {
      _error = null;
      _fields = {};
    });
    if (_quote?.requiresRx == true && _rxChoice == 'new' && _rxFile == null) return setState(() => _error = 'Please attach a photo or PDF of your prescription.');
    if (!_agree) return setState(() => _error = 'Please confirm you agree to the terms of service.');
    setState(() => _submitting = true);
    try {
      String? prescriptionId;
      if (_quote?.requiresRx == true && user != null) {
        if (_rxChoice == 'new') {
          final res = await api.upload(
            '/prescriptions',
            files: {'file': _rxFile!.path},
            fields: {'patientName': _rxPatient.text.trim(), if (_rxPrescriber.text.trim().isNotEmpty) 'prescriberName': _rxPrescriber.text.trim()},
          );
          prescriptionId = (res['prescription'] as Json)['id'] as String;
        } else {
          prescriptionId = _rxChoice;
        }
      }
      final sel = _selectedAddress;
      final res = await api.post('/orders', {
        'items': cart.payload,
        'fulfilment': _fulfilment,
        'contact': {'firstName': _first.text.trim(), 'lastName': _last.text.trim(), 'email': _email.text.trim(), 'phone': _phone.text.trim()},
        if (_fulfilment == 'DELIVERY')
          'address': {
            ...(sel != null
                ? {'line1': sel.line1, 'line2': sel.line2 ?? '', 'city': sel.city, 'state': sel.state, 'landmark': sel.landmark ?? ''}
                : {'line1': _line1.text.trim(), 'line2': _line2.text.trim(), 'city': _city.text.trim(), 'state': _state, 'landmark': _landmark.text.trim()}),
            if (_pin != null) 'lat': _pin!.latitude,
            if (_pin != null) 'lng': _pin!.longitude,
          },
        'paymentMethod': _payment,
        if (prescriptionId != null) 'prescriptionId': prescriptionId,
        if (_notes.text.trim().isNotEmpty) 'notes': _notes.text.trim(),
        'saveAddress': user != null && _fulfilment == 'DELIVERY' && sel == null && _saveAddress,
      });
      cart.clear();
      if (!mounted) return;
      final number = res['number'] as String, key = res['accessKey'] as String;
      final paymentUrl = res['paymentUrl'] as String?;
      if (paymentUrl != null) {
        await Navigator.of(context).push(
          MaterialPageRoute<void>(
            builder: (_) => PaystackScreen(url: paymentUrl, number: number, accessKey: key),
          ),
        );
        if (mounted) context.pushReplacement('/order/$number?key=$key&new=1');
      } else {
        context.pushReplacement('/order/$number?key=$key&new=1');
      }
    } on ApiException catch (e) {
      setState(() {
        _error = e.message;
        _fields = e.fields;
      });
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final cart = context.watch<CartState>();
    final user = context.watch<AuthState>().user;
    final info = context.watch<StoreState>().info;
    final q = _quote;
    if (cart.items.isEmpty) {
      return Scaffold(
        appBar: AppBar(title: const Text('Checkout')),
        body: Center(
          child: EmptyState(
            icon: Icons.shopping_bag_outlined,
            title: 'Nothing to check out yet',
            action: FilledButton(onPressed: () => context.go('/shop'), child: const Text('Browse products')),
          ),
        ),
      );
    }
    final blockedBySignIn = q?.requiresRx == true && user == null;
    final blockedByVerification = q?.requiresVerification == true && user?.verificationStatus != 'APPROVED';
    final showContactFields = user == null || _editContact || _fields.keys.any((k) => k.startsWith('contact.'));

    Widget section(String title, List<Widget> children, {Widget? action}) => Padding(
      padding: const EdgeInsets.only(bottom: 22),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(title, style: GoogleFonts.plusJakartaSans(fontSize: 16, fontWeight: FontWeight.w800)),
              ),
              ?action,
            ],
          ),
          const SizedBox(height: 10),
          ...children,
        ],
      ),
    );

    InputDecoration dec(String hint, String field) => InputDecoration(hintText: hint, errorText: _fields[field]);
    Widget field(String label, Widget input) => Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: LabeledField(label: label, child: input),
    );

    return Scaffold(
      appBar: AppBar(title: const Text('Checkout')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
        children: [
          if (user == null)
            Padding(
              padding: const EdgeInsets.only(bottom: 14),
              child: Panel(
                color: AppColors.slate50,
                padding: const EdgeInsets.fromLTRB(14, 6, 6, 6),
                child: Row(
                  children: [
                    const Expanded(
                      child: Text('Checking out as a guest.', style: TextStyle(color: AppColors.inkSoft)),
                    ),
                    TextButton(onPressed: () => context.push('/login?next=/checkout'), child: const Text('Sign in')),
                  ],
                ),
              ),
            ),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 14),
              child: AlertBox(tone: AlertTone.error, title: "We couldn't place your order", message: _error),
            ),
          if (blockedBySignIn)
            Padding(
              padding: const EdgeInsets.only(bottom: 14),
              child: AlertBox(
                tone: AlertTone.warning,
                title: 'Sign in to order prescription medicines',
                child: TextButton(onPressed: () => context.push('/login?next=/checkout'), child: const Text('Sign in or create an account')),
              ),
            ),
          if (blockedByVerification && user != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 14),
              child: AlertBox(
                tone: AlertTone.warning,
                title: 'Identity verification needed',
                message: user.verificationStatus == 'PENDING'
                    ? "Your verification is being reviewed. We'll email you once it's approved."
                    : 'Your cart contains a controlled medicine. Verify your identity (about 2 minutes), then come back.',
                child: user.verificationStatus == 'PENDING' ? null : TextButton(onPressed: () => context.push('/account/verification'), child: const Text('Verify now')),
              ),
            ),

          // Contact: full form for guests, a one-line summary for signed-in customers.
          section(
            'Contact',
            showContactFields
                ? [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: field('First name', TextField(controller: _first, decoration: dec('First name', 'contact.firstName'), textCapitalization: TextCapitalization.words)),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: field('Last name', TextField(controller: _last, decoration: dec('Last name', 'contact.lastName'), textCapitalization: TextCapitalization.words)),
                        ),
                      ],
                    ),
                    field('Email', TextField(controller: _email, keyboardType: TextInputType.emailAddress, decoration: dec('you@example.com', 'contact.email'))),
                    field('Mobile number', TextField(controller: _phone, keyboardType: TextInputType.phone, decoration: dec('0803 123 4567', 'contact.phone'))),
                  ]
                : [
                    Panel(
                      child: Row(
                        children: [
                          const IconBadge(Icons.person_outline_rounded, size: 38),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('${_first.text} ${_last.text}'.trim(), style: const TextStyle(fontWeight: FontWeight.w700)),
                                Text([_phone.text, _email.text].where((s) => s.isNotEmpty).join(' · '), style: const TextStyle(fontSize: 12.5, color: AppColors.inkMuted)),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
            action: user != null && !showContactFields ? TextButton(onPressed: () => setState(() => _editContact = true), child: const Text('Edit')) : null,
          ),

          // Address (delivery) or the store (pickup).
          if (_fulfilment == 'DELIVERY')
            section('Delivery Address', [
              for (final a in _addresses)
                _Choice(
                  selected: _addressId == a.id,
                  icon: Icons.home_outlined,
                  title: '${a.label} · ${a.fullName}',
                  subtitle: a.oneLine,
                  onTap: () {
                    setState(() => _addressId = a.id);
                    _requote();
                  },
                ),
              if (_addresses.isNotEmpty)
                _Choice(
                  selected: _addressId == 'new',
                  icon: Icons.add_location_alt_outlined,
                  title: 'Add new address',
                  subtitle: 'Deliver somewhere else',
                  onTap: () => setState(() => _addressId = 'new'),
                ),
              if (_addressId == 'new') ...[
                const SizedBox(height: 4),
                field('Street address', TextField(controller: _line1, decoration: dec('House number and street', 'address.line1'))),
                field('Apartment, estate or area (optional)', TextField(controller: _line2, decoration: dec('e.g. Nassarawa GRA', 'address.line2'))),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: field('Town / city', TextField(controller: _city, decoration: dec('e.g. Kano', 'address.city'))),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: field(
                        'State',
                        DropdownButtonFormField<String>(
                          initialValue: _state,
                          isExpanded: true,
                          decoration: dec('State', 'address.state'),
                          items: [
                            for (final s in nigerianStates)
                              DropdownMenuItem(
                                value: s,
                                child: Text(s, overflow: TextOverflow.ellipsis),
                              ),
                          ],
                          onChanged: (v) {
                            setState(() => _state = v!);
                            _requote();
                          },
                        ),
                      ),
                    ),
                  ],
                ),
                field('Nearest landmark (optional)', TextField(controller: _landmark, decoration: dec('e.g. opposite Zoo Road mosque', 'address.landmark'))),
                if (user != null)
                  CheckboxListTile(
                    contentPadding: EdgeInsets.zero,
                    value: _saveAddress,
                    onChanged: (v) => setState(() => _saveAddress = v!),
                    title: const Text('Save this address to my account'),
                    controlAffinity: ListTileControlAffinity.leading,
                  ),
              ],
              const SizedBox(height: 4),
              Row(
                children: [
                  const Icon(Icons.place_outlined, color: AppColors.brand600, size: 18),
                  const SizedBox(width: 6),
                  const Expanded(
                    child: Text('Pin your exact location (optional)', style: TextStyle(fontWeight: FontWeight.w600)),
                  ),
                  TextButton.icon(
                    onPressed: _locating ? null : _useMyLocation,
                    icon: _locating ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.my_location, size: 18),
                    label: const Text('Use my location'),
                  ),
                ],
              ),
              if (info != null)
                ClipRRect(
                  borderRadius: BorderRadius.circular(14),
                  child: MgkMap(
                    height: 200,
                    scrollFriendly: true,
                    pins: _pin != null ? [MapPin(PinKind.home, _pin!)] : [MapPin(PinKind.store, LatLng(info.storeLat, info.storeLng))],
                    fitKey: _pin == null ? 'store' : '${_pin!.latitude.toStringAsFixed(4)},${_pin!.longitude.toStringAsFixed(4)}',
                    onTap: (p) => setState(() => _pin = p),
                  ),
                ),
              Padding(
                padding: const EdgeInsets.only(top: 6),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(_pin == null ? 'Tap the map where you want the delivery.' : 'Pin set. Tap elsewhere to move it.', style: const TextStyle(fontSize: 12, color: AppColors.inkMuted)),
                    ),
                    if (_pin != null) TextButton(onPressed: () => setState(() => _pin = null), child: const Text('Clear')),
                  ],
                ),
              ),
            ])
          else
            section('Pickup Location', [
              Panel(
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const IconBadge(Icons.storefront_outlined, size: 38),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        '${Site.name}\n${Site.addressLine1}, ${Site.addressLine2}, ${Site.city}\n${Site.hours.map((h) => '${h.$1} ${h.$2}').join(' · ')}\nWe\'ll message you when it\'s ready.',
                        style: const TextStyle(height: 1.45, fontSize: 13.5),
                      ),
                    ),
                  ],
                ),
              ),
            ]),

          section('Delivery Option', [
            _Choice(
              selected: _fulfilment == 'DELIVERY',
              icon: Icons.local_shipping_outlined,
              title: 'Home delivery',
              subtitle: q?.zone != null ? '${q!.zone!['etaLabel']}' : 'Across Nigeria',
              trailing: _fulfilment == 'DELIVERY' && q != null ? (q.shippingKobo == 0 ? 'Free' : naira(q.shippingKobo)) : null,
              onTap: () {
                setState(() {
                  _fulfilment = 'DELIVERY';
                  if (_payment == 'PAY_ON_PICKUP') _payment = info?.paystack == true ? 'PAYSTACK' : 'BANK_TRANSFER';
                });
                _requote();
              },
            ),
            _Choice(
              selected: _fulfilment == 'PICKUP',
              icon: Icons.storefront_outlined,
              title: 'Pick up in store',
              subtitle: 'Ready in about 1 hour, Kano',
              trailing: 'Free',
              onTap: () {
                setState(() => _fulfilment = 'PICKUP');
                _requote();
              },
            ),
            if (q?.hasColdChain == true) const Text('Refrigerated items are packed in insulated cool boxes.', style: TextStyle(color: AppColors.sky800, fontSize: 13)),
          ]),

          if (q?.requiresRx == true && user != null)
            section('Prescription', [
              Text('Needed for: ${q!.lines.where((l) => l.rxStatus != 'OTC').map((l) => l.name).join(', ')}.', style: const TextStyle(color: AppColors.inkMuted)),
              const SizedBox(height: 8),
              for (final p in _prescriptions)
                _Choice(
                  selected: _rxChoice == p.id,
                  icon: Icons.description_outlined,
                  title: p.patientName,
                  subtitle: 'Uploaded ${fmtDate(p.createdAt)}${p.validUntil != null ? ' · valid until ${fmtDate(p.validUntil)}' : ''}',
                  badge: ReviewPill(p.status),
                  onTap: () => setState(() => _rxChoice = p.id),
                ),
              _Choice(selected: _rxChoice == 'new', icon: Icons.upload_file_outlined, title: 'Upload a new prescription', subtitle: 'Photo or PDF', onTap: () => setState(() => _rxChoice = 'new')),
              if (_rxChoice == 'new') ...[
                FilePickField(
                  label: 'Prescription',
                  file: _rxFile,
                  onChanged: (f) => setState(() => _rxFile = f),
                  hint: "A clear photo showing the patient's name, medicine, dose, prescriber's signature and date.",
                ),
                const SizedBox(height: 12),
                field("Patient's full name", TextField(controller: _rxPatient, decoration: dec('As written on the prescription', 'patientName'))),
                field('Prescriber / hospital (optional)', TextField(controller: _rxPrescriber, decoration: dec('e.g. Dr. A. Yusuf, AKTH', 'prescriberName'))),
              ],
              if (_rxNeedsReview)
                const AlertBox(title: "You'll pay after approval", message: "A pharmacist reviews your prescription, usually within 2 working hours. We'll email you, then you can pay."),
            ]),

          section('Payment Method', [
            if (info?.paystack == true)
              _Choice(
                selected: _payment == 'PAYSTACK',
                icon: Icons.credit_card,
                title: 'Card (Visa, Mastercard, Verve)',
                subtitle: 'Also bank and USSD. Instant confirmation.',
                onTap: () => setState(() => _payment = 'PAYSTACK'),
              ),
            _Choice(
              selected: _payment == 'BANK_TRANSFER',
              icon: Icons.account_balance_outlined,
              title: 'Bank Transfer',
              subtitle: info == null
                  ? 'Transfer and upload your receipt.'
                  : 'To ${info.bank['accountName']} (${info.bank['name']}). Upload your receipt. Unpaid orders are released after ${info.unpaidOrderTtlHours} hours.',
              onTap: () => setState(() => _payment = 'BANK_TRANSFER'),
            ),
            if (_fulfilment == 'PICKUP')
              _Choice(
                selected: _payment == 'PAY_ON_PICKUP',
                icon: Icons.payments_outlined,
                title: 'Pay at pickup',
                subtitle: 'Card, transfer or cash when you collect.',
                onTap: () => setState(() => _payment = 'PAY_ON_PICKUP'),
              ),
          ]),

          section('Order Summary', [
            Panel(
              child: Column(
                children: [
                  for (final i in cart.items)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 3),
                      child: Row(
                        children: [
                          Expanded(child: Text('${i.quantity} × ${i.name} ${i.strength ?? ''}', maxLines: 1, overflow: TextOverflow.ellipsis)),
                          Text(naira((q?.line(i.productId)?.priceKobo ?? i.priceKobo) * i.quantity), style: const TextStyle(fontWeight: FontWeight.w600)),
                        ],
                      ),
                    ),
                  const Divider(height: 18, color: AppColors.line),
                  KeyValue('Subtotal', q == null ? '…' : naira(q.subtotalKobo)),
                  KeyValue(_fulfilment == 'PICKUP' ? 'Pickup' : 'Delivery${q?.zone != null ? ' (${q!.zone!['name']})' : ''}', q == null ? '…' : (q.shippingKobo == 0 ? 'Free' : naira(q.shippingKobo))),
                  KeyValue('Total', q == null ? '…' : naira(q.totalKobo), bold: true),
                ],
              ),
            ),
            const SizedBox(height: 12),
            LabeledField(
              label: 'Order notes (optional)',
              child: TextField(
                controller: _notes,
                maxLines: 3,
                maxLength: 500,
                decoration: const InputDecoration(hintText: 'Delivery instructions, or anything our pharmacist should know'),
              ),
            ),
            CheckboxListTile(
              contentPadding: EdgeInsets.zero,
              controlAffinity: ListTileControlAffinity.leading,
              value: _agree,
              onChanged: (v) => setState(() => _agree = v!),
              title: Wrap(
                children: [
                  const Text('I agree to the '),
                  InkWell(
                    onTap: () => context.push('/info/terms'),
                    child: const Text(
                      'terms of service',
                      style: TextStyle(decoration: TextDecoration.underline, fontWeight: FontWeight.w600),
                    ),
                  ),
                  const Text(' and '),
                  InkWell(
                    onTap: () => context.push('/info/privacy'),
                    child: const Text(
                      'privacy policy',
                      style: TextStyle(decoration: TextDecoration.underline, fontWeight: FontWeight.w600),
                    ),
                  ),
                  const Text(", and confirm the information I've given is accurate."),
                ],
              ),
            ),
            const Text('You can cancel free of charge any time before your order is dispatched.', style: TextStyle(fontSize: 12, color: AppColors.inkMuted)),
          ]),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Container(
          padding: const EdgeInsets.fromLTRB(16, 10, 16, 10),
          decoration: const BoxDecoration(
            color: Colors.white,
            border: Border(top: BorderSide(color: AppColors.line)),
          ),
          child: FilledButton(
            onPressed: _submitting || q == null || q.hasIssues || blockedBySignIn || blockedByVerification ? null : _submit,
            child: _submitting
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : Text(
                    _rxNeedsReview
                        ? 'Submit for pharmacist review'
                        : _payment == 'PAYSTACK'
                        ? 'Pay ${q == null ? '' : naira(q.totalKobo)}'
                        : 'Place Order · ${q == null ? '' : naira(q.totalKobo)}',
                  ),
          ),
        ),
      ),
    );
  }
}

/// Radio-style option row: radio on the left, title and detail, optional price or badge on the right.
class _Choice extends StatelessWidget {
  const _Choice({required this.selected, required this.icon, required this.title, required this.subtitle, required this.onTap, this.trailing, this.badge});
  final bool selected;
  final IconData icon;
  final String title, subtitle;
  final VoidCallback onTap;
  final String? trailing;
  final Widget? badge;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 10),
    child: Material(
      color: selected ? AppColors.brand50 : Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(color: selected ? AppColors.brand500 : AppColors.line, width: selected ? 1.6 : 1),
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(10, 12, 14, 12),
          child: Row(
            children: [
              Icon(selected ? Icons.radio_button_checked_rounded : Icons.radio_button_off_rounded, color: selected ? AppColors.brand600 : const Color(0xFFCBD5E1)),
              const SizedBox(width: 10),
              Icon(icon, color: selected ? AppColors.brand600 : AppColors.inkSoft, size: 20),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                    Text(subtitle, style: const TextStyle(fontSize: 12.5, color: AppColors.inkMuted)),
                  ],
                ),
              ),
              if (badge != null) Padding(padding: const EdgeInsets.only(left: 8), child: badge),
              if (trailing != null)
                Padding(
                  padding: const EdgeInsets.only(left: 8),
                  child: Text(trailing!, style: const TextStyle(fontWeight: FontWeight.w700)),
                ),
            ],
          ),
        ),
      ),
    ),
  );
}
