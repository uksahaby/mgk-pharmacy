import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/api.dart';
import '../../core/format.dart';
import '../../core/models.dart';
import '../../core/theme.dart';
import '../../state/auth_state.dart';
import '../../state/cart_state.dart';
import '../../widgets/common.dart';
import '../../widgets/product_widgets.dart';

/// Live server quote for the current cart (prices, stock, delivery), refreshed when the cart changes.
Future<Quote> fetchQuote(CartState cart, {String fulfilment = 'DELIVERY', String? state}) async =>
    Quote(await api.post('/cart/quote', {'items': cart.payload, 'fulfilment': fulfilment, 'state': state}));

class CartScreen extends StatefulWidget {
  const CartScreen({super.key});
  @override
  State<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends State<CartScreen> {
  Quote? _quote;
  String _state = 'Kano';
  Timer? _debounce;
  String _lastKey = '';

  void _requote(CartState cart) {
    final key = '${cart.payload}$_state';
    if (key == _lastKey) return;
    _lastKey = key;
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 250), () async {
      try {
        final q = await fetchQuote(cart, state: _state);
        if (!mounted) return;
        // Drop items the pharmacy no longer sells.
        for (final i in cart.items.where((i) => q.line(i.productId) == null).toList()) {
          cart.remove(i.productId);
        }
        setState(() => _quote = q);
      } catch (_) {}
    });
  }

  @override
  void dispose() {
    _debounce?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final cart = context.watch<CartState>();
    final user = context.watch<AuthState>().user;
    WidgetsBinding.instance.addPostFrameCallback((_) => _requote(cart));
    final q = _quote;

    if (cart.items.isEmpty) {
      return Scaffold(
        appBar: AppBar(title: const Text('Your cart')),
        body: Center(
          child: EmptyState(
            icon: Icons.shopping_bag_outlined,
            title: 'Your cart is empty',
            message: 'Browse medicines and health products, or upload a prescription and our pharmacist will help you.',
            action: FilledButton(onPressed: () => context.go('/shop'), child: const Text('Start shopping')),
          ),
        ),
      );
    }

    final needsSignIn = q?.requiresRx == true && user == null;
    return Scaffold(
      appBar: AppBar(title: const Text('Your cart')),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        if (q != null)
          CardBox(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(q.freeDelivery ? "You've unlocked free delivery" : 'Add ${naira(q.amountToFreeDeliveryKobo)} more for free delivery',
                  style: TextStyle(fontWeight: FontWeight.w600, color: q.freeDelivery ? AppColors.care700 : AppColors.inkSoft)),
              const SizedBox(height: 8),
              ClipRRect(
                borderRadius: BorderRadius.circular(9),
                child: LinearProgressIndicator(
                  value: (q.subtotalKobo / q.freeDeliveryThresholdKobo).clamp(0, 1).toDouble(),
                  minHeight: 8,
                  backgroundColor: AppColors.slate100,
                  color: AppColors.care500,
                ),
              ),
            ]),
          ),
        if (q?.requiresRx == true) ...[
          const SizedBox(height: 12),
          AlertBox(
            tone: AlertTone.warning,
            title: 'Your cart contains prescription-only medicines',
            message: "You'll upload a prescription at checkout${user == null ? ' (sign in required)' : ''}. A pharmacist reviews it before you pay."
                '${q!.requiresVerification ? ' Controlled medicines also need a verified account.' : ''}',
          ),
        ],
        const SizedBox(height: 12),
        Card(
          child: Column(children: [
            for (final item in cart.items) ...[
              _CartLine(item: item, line: q?.line(item.productId)),
              if (item != cart.items.last) const Divider(),
            ],
          ]),
        ),
        const SizedBox(height: 12),
        CardBox(
          child: Column(children: [
            KeyValue('Subtotal', q == null ? '…' : naira(q.subtotalKobo)),
            Row(children: [
              const Text('Delivery to ', style: TextStyle(color: AppColors.inkMuted)),
              DropdownButton<String>(
                value: _state,
                isDense: true,
                underline: const SizedBox.shrink(),
                items: [for (final s in nigerianStates) DropdownMenuItem(value: s, child: Text(s))],
                onChanged: (v) => setState(() => _state = v!),
              ),
              const Spacer(),
              Text(q == null ? '…' : (q.shippingKobo == 0 ? 'Free' : naira(q.shippingKobo)), style: const TextStyle(fontWeight: FontWeight.w600)),
            ]),
            if (q?.zone != null) Align(alignment: Alignment.centerLeft, child: Text('${q!.zone!['etaLabel']}. Free pickup available in Kano.', style: const TextStyle(fontSize: 12, color: AppColors.inkMuted))),
            const Divider(height: 20),
            KeyValue('Estimated total', q == null ? '…' : naira(q.totalKobo), bold: true),
          ]),
        ),
        const SizedBox(height: 90),
      ]),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
          child: FilledButton(
            onPressed: q == null || q.hasIssues ? null : () => context.push(needsSignIn ? '/login?next=/checkout' : '/checkout'),
            child: Text(needsSignIn ? 'Sign in to checkout' : 'Continue to checkout'),
          ),
        ),
      ),
    );
  }
}

class _CartLine extends StatelessWidget {
  const _CartLine({required this.item, this.line});
  final CartItem item;
  final QuoteLine? line;
  @override
  Widget build(BuildContext context) {
    final cart = context.read<CartState>();
    final price = line?.priceKobo ?? item.priceKobo;
    return Padding(
      padding: const EdgeInsets.all(14),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        SizedBox(width: 72, child: ClipRRect(borderRadius: BorderRadius.circular(12), child: ProductArt(name: item.name, icon: item.icon, size: ArtSize.sm))),
        const SizedBox(width: 12),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            InkWell(onTap: () => context.push('/product/${item.slug}'), child: Text('${item.name} ${item.strength ?? ''}', style: const TextStyle(fontWeight: FontWeight.w700))),
            Text(item.packSize, style: const TextStyle(color: AppColors.inkMuted, fontSize: 12.5)),
            const SizedBox(height: 4),
            Wrap(spacing: 6, children: [RxBadge(item.rxStatus), if (line?.coldChain == true) const ColdChainBadge()]),
            if (line?.issue != null) Padding(padding: const EdgeInsets.only(top: 4), child: Text('${line!.issue}. Please adjust the quantity.', style: const TextStyle(color: AppColors.brand700, fontWeight: FontWeight.w600, fontSize: 12.5))),
            const SizedBox(height: 8),
            Row(children: [
              QuantityStepper(small: true, value: item.quantity, max: line == null ? 50 : line!.available.clamp(1, 50), onChanged: (v) => cart.setQuantity(item.productId, v)),
              const Spacer(),
              IconButton(onPressed: () => cart.remove(item.productId), icon: const Icon(Icons.delete_outline, color: AppColors.inkMuted), tooltip: 'Remove ${item.name}'),
            ]),
          ]),
        ),
        Text(naira(price * item.quantity), style: const TextStyle(fontWeight: FontWeight.w700)),
      ]),
    );
  }
}
