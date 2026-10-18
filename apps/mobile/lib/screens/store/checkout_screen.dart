import 'dart:async';

import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
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
  bool _saveAddress = true, _agree = false, _submitting = false, _locating = false;
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
      final pos = await Geolocator.getCurrentPosition(locationSettings: const LocationSettings(accuracy: LocationAccuracy.high, timeLimit: Duration(seconds: 15)));
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
          final res = await api.upload('/prescriptions', files: {'file': _rxFile!.path}, fields: {
            'patientName': _rxPatient.text.trim(),
            if (_rxPrescriber.text.trim().isNotEmpty) 'prescriberName': _rxPrescriber.text.trim(),
          });
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
        await Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => PaystackScreen(url: paymentUrl, number: number, accessKey: key)));
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
      return Scaffold(appBar: AppBar(title: const Text('Checkout')), body: Center(child: EmptyState(icon: Icons.shopping_bag_outlined, title: 'Nothing to check out yet', action: FilledButton(onPressed: () => context.go('/shop'), child: const Text('Browse products')))));
    }
    final blockedBySignIn = q?.requiresRx == true && user == null;
    final blockedByVerification = q?.requiresVerification == true && user?.verificationStatus != 'APPROVED';
    var step = 0;
    Widget stepCard(String title, List<Widget> children) {
      step++;
      return Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: CardBox(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              CircleAvatar(radius: 13, backgroundColor: AppColors.ink, child: Text('$step', style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w800))),
              const SizedBox(width: 10),
              Text(title, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
            ]),
            const SizedBox(height: 14),
            ...children,
          ]),
        ),
      );
    }

    InputDecoration dec(String label, String field, {String? hint, bool optional = false}) =>
        InputDecoration(labelText: optional ? '$label (optional)' : label, hintText: hint, errorText: _fields[field]);

    return Scaffold(
      appBar: AppBar(title: const Text('Checkout')),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        if (user == null)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Row(children: [
              const Expanded(child: Text('Checking out as a guest.', style: TextStyle(color: AppColors.inkMuted))),
              TextButton(onPressed: () => context.push('/login?next=/checkout'), child: const Text('Sign in')),
            ]),
          ),
        if (_error != null) Padding(padding: const EdgeInsets.only(bottom: 12), child: AlertBox(tone: AlertTone.error, title: "We couldn't place your order", message: _error)),
        if (blockedBySignIn)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: AlertBox(tone: AlertTone.warning, title: 'Sign in to order prescription medicines', child: TextButton(onPressed: () => context.push('/login?next=/checkout'), child: const Text('Sign in or create an account'))),
          ),
        if (blockedByVerification && user != null)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: AlertBox(
              tone: AlertTone.warning,
              title: 'Identity verification needed',
              message: user.verificationStatus == 'PENDING' ? "Your verification is being reviewed. We'll email you once it's approved." : 'Your cart contains a controlled medicine. Verify your identity (about 2 minutes), then come back.',
              child: user.verificationStatus == 'PENDING' ? null : TextButton(onPressed: () => context.push('/account/verification'), child: const Text('Verify now')),
            ),
          ),
        stepCard('Contact details', [
          Row(children: [
            Expanded(child: TextField(controller: _first, decoration: dec('First name', 'contact.firstName'), textCapitalization: TextCapitalization.words)),
            const SizedBox(width: 10),
            Expanded(child: TextField(controller: _last, decoration: dec('Last name', 'contact.lastName'), textCapitalization: TextCapitalization.words)),
          ]),
          const SizedBox(height: 10),
          TextField(controller: _email, keyboardType: TextInputType.emailAddress, decoration: dec('Email', 'contact.email')),
          const SizedBox(height: 10),
          TextField(controller: _phone, keyboardType: TextInputType.phone, decoration: dec('Mobile number', 'contact.phone', hint: '0803 123 4567')),
        ]),
        stepCard('Delivery or pickup', [
          _Choice(
            selected: _fulfilment == 'DELIVERY',
            icon: Icons.local_shipping_outlined,
            title: 'Home delivery',
            subtitle: q?.zone != null ? '${q!.zone!['etaLabel']} · ${q.shippingKobo == 0 ? 'Free' : naira(q.shippingKobo)}' : 'Across Nigeria',
            onTap: () {
              setState(() {
                _fulfilment = 'DELIVERY';
                if (_payment == 'PAY_ON_PICKUP') _payment = info?.paystack == true ? 'PAYSTACK' : 'BANK_TRANSFER';
              });
              _requote();
            },
          ),
          _Choice(selected: _fulfilment == 'PICKUP', icon: Icons.storefront_outlined, title: 'Pick up in store', subtitle: 'Free · Ready in about 1 hour', onTap: () {
            setState(() => _fulfilment = 'PICKUP');
            _requote();
          }),
          const SizedBox(height: 8),
          if (_fulfilment == 'DELIVERY') ...[
            for (final a in _addresses)
              RadioListTile<String>(
                contentPadding: EdgeInsets.zero,
                value: a.id,
                groupValue: _addressId,
                onChanged: (v) {
                  setState(() => _addressId = v!);
                  _requote();
                },
                title: Text('${a.label} · ${a.fullName}', style: const TextStyle(fontWeight: FontWeight.w600)),
                subtitle: Text(a.oneLine),
              ),
            if (_addresses.isNotEmpty)
              RadioListTile<String>(contentPadding: EdgeInsets.zero, value: 'new', groupValue: _addressId, onChanged: (v) => setState(() => _addressId = v!), title: const Text('Use a new address', style: TextStyle(fontWeight: FontWeight.w600))),
            if (_addressId == 'new') ...[
              TextField(controller: _line1, decoration: dec('Street address', 'address.line1', hint: 'House number and street')),
              const SizedBox(height: 10),
              TextField(controller: _line2, decoration: dec('Apartment, estate or area', 'address.line2', optional: true)),
              const SizedBox(height: 10),
              Row(children: [
                Expanded(child: TextField(controller: _city, decoration: dec('Town / city', 'address.city'))),
                const SizedBox(width: 10),
                Expanded(
                  child: DropdownButtonFormField<String>(
                    initialValue: _state,
                    isExpanded: true,
                    decoration: dec('State', 'address.state'),
                    items: [for (final s in nigerianStates) DropdownMenuItem(value: s, child: Text(s, overflow: TextOverflow.ellipsis))],
                    onChanged: (v) {
                      setState(() => _state = v!);
                      _requote();
                    },
                  ),
                ),
              ]),
              const SizedBox(height: 10),
              TextField(controller: _landmark, decoration: dec('Nearest landmark', 'address.landmark', optional: true, hint: 'e.g. opposite Zoo Road mosque')),
              if (user != null) CheckboxListTile(contentPadding: EdgeInsets.zero, value: _saveAddress, onChanged: (v) => setState(() => _saveAddress = v!), title: const Text('Save this address to my account'), controlAffinity: ListTileControlAffinity.leading),
            ],
            const SizedBox(height: 8),
            Row(children: [
              const Icon(Icons.place_outlined, color: AppColors.brand600, size: 18),
              const SizedBox(width: 6),
              const Expanded(child: Text('Pin your exact location (optional)', style: TextStyle(fontWeight: FontWeight.w600))),
              TextButton.icon(
                onPressed: _locating ? null : _useMyLocation,
                icon: _locating ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.my_location, size: 18),
                label: const Text('Use my location'),
              ),
            ]),
            if (info != null)
              MgkMap(
                height: 220,
                pins: _pin != null ? [MapPin(PinKind.home, _pin!)] : [MapPin(PinKind.store, LatLng(info.storeLat, info.storeLng))],
                fitKey: _pin == null ? 'store' : '${_pin!.latitude.toStringAsFixed(4)},${_pin!.longitude.toStringAsFixed(4)}',
                onTap: (p) => setState(() => _pin = p),
              ),
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Row(children: [
                Expanded(child: Text(_pin == null ? 'Tap the map where you want the delivery.' : 'Pin set. Tap elsewhere to move it.', style: const TextStyle(fontSize: 12, color: AppColors.inkMuted))),
                if (_pin != null) TextButton(onPressed: () => setState(() => _pin = null), child: const Text('Clear')),
              ]),
            ),
            if (q?.hasColdChain == true) const Padding(padding: EdgeInsets.only(top: 6), child: Text('Refrigerated items are packed in insulated cool boxes.', style: TextStyle(color: AppColors.sky800, fontSize: 13))),
          ] else
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(color: AppColors.slate50, borderRadius: BorderRadius.circular(14)),
              child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Icon(Icons.place_outlined, color: AppColors.brand600),
                const SizedBox(width: 10),
                Expanded(child: Text('${Site.name}\n${Site.addressLine1}, ${Site.addressLine2}, ${Site.city}\n${Site.hours.map((h) => '${h.$1} ${h.$2}').join(' · ')}\nWe\'ll message you when it\'s ready.', style: const TextStyle(height: 1.45))),
              ]),
            ),
        ]),
        if (q?.requiresRx == true && user != null)
          stepCard('Prescription', [
            Text('Needed for: ${q!.lines.where((l) => l.rxStatus != 'OTC').map((l) => l.name).join(', ')}.', style: const TextStyle(color: AppColors.inkMuted)),
            for (final p in _prescriptions)
              RadioListTile<String>(
                contentPadding: EdgeInsets.zero,
                value: p.id,
                groupValue: _rxChoice,
                onChanged: (v) => setState(() => _rxChoice = v!),
                title: Row(children: [Expanded(child: Text(p.patientName, style: const TextStyle(fontWeight: FontWeight.w600))), ReviewPill(p.status)]),
                subtitle: Text('Uploaded ${fmtDate(p.createdAt)}${p.validUntil != null ? ' · valid until ${fmtDate(p.validUntil)}' : ''}'),
              ),
            RadioListTile<String>(contentPadding: EdgeInsets.zero, value: 'new', groupValue: _rxChoice, onChanged: (v) => setState(() => _rxChoice = v!), title: const Text('Upload a new prescription', style: TextStyle(fontWeight: FontWeight.w600))),
            if (_rxChoice == 'new') ...[
              FilePickField(label: 'Prescription', file: _rxFile, onChanged: (f) => setState(() => _rxFile = f), hint: "A clear photo showing the patient's name, medicine, dose, prescriber's signature and date."),
              const SizedBox(height: 10),
              TextField(controller: _rxPatient, decoration: dec("Patient's full name", 'patientName')),
              const SizedBox(height: 10),
              TextField(controller: _rxPrescriber, decoration: dec('Prescriber / hospital', 'prescriberName', optional: true)),
            ],
            if (_rxNeedsReview) const Padding(padding: EdgeInsets.only(top: 10), child: AlertBox(title: "You'll pay after approval", message: 'A pharmacist reviews your prescription, usually within 2 working hours. We\'ll email you, then you can pay.')),
          ]),
        stepCard('Payment', [
          if (info?.paystack == true) _Choice(selected: _payment == 'PAYSTACK', icon: Icons.credit_card, title: 'Card, bank or USSD', subtitle: 'Instant confirmation via Paystack.', onTap: () => setState(() => _payment = 'PAYSTACK')),
          _Choice(
            selected: _payment == 'BANK_TRANSFER',
            icon: Icons.account_balance_outlined,
            title: 'Bank transfer',
            subtitle: info == null ? 'Transfer and upload your receipt.' : 'Transfer to ${info.bank['accountName']} (${info.bank['name']}) and upload your receipt. Unpaid orders are released after ${info.unpaidOrderTtlHours} hours.',
            onTap: () => setState(() => _payment = 'BANK_TRANSFER'),
          ),
          if (_fulfilment == 'PICKUP') _Choice(selected: _payment == 'PAY_ON_PICKUP', icon: Icons.storefront_outlined, title: 'Pay at pickup', subtitle: 'Pay by card, transfer or cash when you collect.', onTap: () => setState(() => _payment = 'PAY_ON_PICKUP')),
        ]),
        CardBox(
          child: Column(children: [
            TextField(controller: _notes, maxLines: 3, maxLength: 500, decoration: const InputDecoration(labelText: 'Order notes (optional)', hintText: 'Delivery instructions, or anything our pharmacist should know')),
            CheckboxListTile(
              contentPadding: EdgeInsets.zero,
              controlAffinity: ListTileControlAffinity.leading,
              value: _agree,
              onChanged: (v) => setState(() => _agree = v!),
              title: Wrap(children: [
                const Text('I agree to the '),
                InkWell(onTap: () => context.push('/info/terms'), child: const Text('terms of service', style: TextStyle(decoration: TextDecoration.underline, fontWeight: FontWeight.w600))),
                const Text(' and '),
                InkWell(onTap: () => context.push('/info/privacy'), child: const Text('privacy policy', style: TextStyle(decoration: TextDecoration.underline, fontWeight: FontWeight.w600))),
                const Text(", and confirm the information I've given is accurate."),
              ]),
            ),
          ]),
        ),
        const SizedBox(height: 12),
        CardBox(
          child: Column(children: [
            for (final i in cart.items)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 3),
                child: Row(children: [
                  Expanded(child: Text('${i.quantity} × ${i.name} ${i.strength ?? ''}', maxLines: 1, overflow: TextOverflow.ellipsis)),
                  Text(naira((q?.line(i.productId)?.priceKobo ?? i.priceKobo) * i.quantity), style: const TextStyle(fontWeight: FontWeight.w600)),
                ]),
              ),
            const Divider(height: 18),
            KeyValue('Subtotal', q == null ? '…' : naira(q.subtotalKobo)),
            KeyValue(_fulfilment == 'PICKUP' ? 'Pickup' : 'Delivery${q?.zone != null ? ' (${q!.zone!['name']})' : ''}', q == null ? '…' : (q.shippingKobo == 0 ? 'Free' : naira(q.shippingKobo))),
            KeyValue('Total', q == null ? '…' : naira(q.totalKobo), bold: true),
          ]),
        ),
        const SizedBox(height: 8),
        const Text('You can cancel free of charge any time before your order is dispatched.', textAlign: TextAlign.center, style: TextStyle(fontSize: 12, color: AppColors.inkMuted)),
        const SizedBox(height: 90),
      ]),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
          child: FilledButton.icon(
            onPressed: _submitting || q == null || q.hasIssues || blockedBySignIn || blockedByVerification ? null : _submit,
            icon: _submitting ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Icon(Icons.lock_outline),
            label: Text(_rxNeedsReview ? 'Submit for pharmacist review' : _payment == 'PAYSTACK' ? 'Continue to secure payment · ${q == null ? '' : naira(q.totalKobo)}' : 'Place order · ${q == null ? '' : naira(q.totalKobo)}'),
          ),
        ),
      ),
    );
  }
}

class _Choice extends StatelessWidget {
  const _Choice({required this.selected, required this.icon, required this.title, required this.subtitle, required this.onTap});
  final bool selected;
  final IconData icon;
  final String title, subtitle;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: InkWell(
          borderRadius: BorderRadius.circular(14),
          onTap: onTap,
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: selected ? AppColors.brand50 : Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: selected ? AppColors.brand500 : AppColors.border, width: selected ? 2 : 1),
            ),
            child: Row(children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(color: selected ? AppColors.brand600 : AppColors.slate100, borderRadius: BorderRadius.circular(10)),
                child: Icon(icon, color: selected ? Colors.white : AppColors.inkSoft, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(title, style: const TextStyle(fontWeight: FontWeight.w700)), Text(subtitle, style: const TextStyle(fontSize: 12.5, color: AppColors.inkMuted))])),
              Icon(selected ? Icons.radio_button_checked : Icons.radio_button_off, color: selected ? AppColors.brand600 : const Color(0xFFCBD5E1)),
            ]),
          ),
        ),
      );
}
