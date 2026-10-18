import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../../core/api.dart';
import '../../core/config.dart';
import '../../core/format.dart';
import '../../core/models.dart';
import '../../core/theme.dart';
import '../../state/cart_state.dart';
import '../../state/store_state.dart';
import '../../widgets/common.dart';
import '../../widgets/product_widgets.dart';
import '../../widgets/ui.dart';

class ProductScreen extends StatelessWidget {
  const ProductScreen({super.key, required this.slug});
  final String slug;

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(actions: const [CartButton(), SizedBox(width: 4)]),
    body: Loader(
      load: () => api.get('/products/$slug'),
      builder: (context, data, _) {
        final p = Product(data['product'] as Json);
        final alternatives = (data['alternatives'] as List).map((e) => Product(e as Json)).toList();
        final related = (data['related'] as List).map((e) => Product(e as Json)).toList();
        return _ProductBody(p: p, alternatives: alternatives, related: related);
      },
    ),
  );
}

class _ProductBody extends StatefulWidget {
  const _ProductBody({required this.p, required this.alternatives, required this.related});
  final Product p;
  final List<Product> alternatives, related;
  @override
  State<_ProductBody> createState() => _ProductBodyState();
}

class _ProductBodyState extends State<_ProductBody> {
  int _qty = 1;

  void _add() {
    final p = widget.p;
    context.read<CartState>().add(p.id, CartState.snapshotOf(p), _qty);
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          behavior: SnackBarBehavior.floating,
          content: Text('$_qty × ${p.name} added to your cart'),
        duration: const Duration(seconds: 3),
        persist: false, // close on its own even though it has an action
          action: SnackBarAction(label: 'View cart', onPressed: () => context.push('/cart')),
        ),
      );
  }

  @override
  Widget build(BuildContext context) {
    final p = widget.p;
    final tone = toneFor(p.icon);
    final cheaper = widget.alternatives.where((a) => a.priceKobo < p.priceKobo && a.inStock).toList();
    final kano = context.watch<StoreState>().info?.zones.where((z) => z.code == 'KANO').firstOrNull;
    final sections = [
      ('How to use', p.usage),
      ('Warnings & side effects', p.warnings),
      ('Storage', p.storage),
      ('Manufacturer', '${p.manufacturer ?? p.brand}. Supplied through licensed distributors in Nigeria.'),
    ].where((s) => s.$2.trim().isNotEmpty);
    return Column(
      children: [
        Expanded(
          child: ListView(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 4, 16, 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Picture in a soft frame, badges on top.
                    ClipRRect(
                      borderRadius: BorderRadius.circular(18),
                      child: Container(
                        height: 250,
                        decoration: BoxDecoration(
                          gradient: RadialGradient(center: const Alignment(-0.6, -0.8), radius: 1.4, colors: [tone.from, tone.to]),
                        ),
                        child: Stack(
                          children: [
                            Center(
                              child: SizedBox(
                                width: 250,
                                child: ProductArt(name: p.brand, strength: p.strength, form: p.packSize, icon: p.icon, size: ArtSize.lg),
                              ),
                            ),
                            Positioned(
                              left: 12,
                              top: 12,
                              child: Row(
                                children: [
                                  RxBadge(p.rxStatus),
                                  if (p.coldChain) const Padding(padding: EdgeInsets.only(left: 6), child: ColdChainBadge()),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 18),
                    Text('${p.name}${p.strength != null ? ' ${p.strength}' : ''}', style: GoogleFonts.plusJakartaSans(fontSize: 23, fontWeight: FontWeight.w800, height: 1.2)),
                    const SizedBox(height: 4),
                    Text(
                      p.categoryName,
                      style: const TextStyle(color: AppColors.brand600, fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 2),
                    Text('${p.genericName} · ${p.dosageForm} · ${p.packSize}', style: const TextStyle(color: AppColors.inkMuted, fontSize: 13)),
                    const SizedBox(height: 14),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(naira(p.priceKobo), style: GoogleFonts.plusJakartaSans(fontSize: 28, fontWeight: FontWeight.w800)),
                        if (p.discountPercent > 0) ...[
                          const SizedBox(width: 8),
                          Padding(
                            padding: const EdgeInsets.only(bottom: 4),
                            child: Text(
                              naira(p.compareAtKobo!),
                              style: const TextStyle(color: AppColors.inkMuted, decoration: TextDecoration.lineThrough, fontSize: 16),
                            ),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 6),
                    Wrap(
                      spacing: 14,
                      runSpacing: 4,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              p.inStock ? Icons.check_circle_rounded : Icons.cancel_rounded,
                              size: 17,
                              color: p.inStock ? (p.lowStock ? AppColors.orange800 : AppColors.care600) : AppColors.brand700,
                            ),
                            const SizedBox(width: 5),
                            Text(
                              p.inStock ? (p.lowStock ? 'Low stock, order soon' : 'In stock') : 'Out of stock',
                              style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: p.inStock ? (p.lowStock ? AppColors.orange800 : AppColors.care700) : AppColors.brand700),
                            ),
                          ],
                        ),
                        if (p.nextExpiry != null)
                          Text('Expires no earlier than ${fmtDate(p.nextExpiry).split(' ').skip(1).join(' ')}', style: const TextStyle(color: AppColors.inkMuted, fontSize: 13)),
                      ],
                    ),
                    if (p.inStock) ...[
                      const SizedBox(height: 16),
                      Align(
                        alignment: Alignment.centerLeft,
                        child: QuantityStepper(value: _qty, max: p.stockAvailable.clamp(1, 50), onChanged: (v) => setState(() => _qty = v)),
                      ),
                    ],
                    if (p.rxStatus != 'OTC') ...[
                      const SizedBox(height: 16),
                      AlertBox(
                        tone: AlertTone.warning,
                        title: rxLabel[p.rxStatus],
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            if (p.rxStatus == 'CONTROLLED') const Text('1. Verify your identity once (about 2 minutes).'),
                            Text('${p.rxStatus == 'CONTROLLED' ? '2' : '1'}. Add to cart and upload your prescription at checkout.'),
                            Text('${p.rxStatus == 'CONTROLLED' ? '3' : '2'}. A pharmacist reviews it, usually within 2 working hours.'),
                            Text('${p.rxStatus == 'CONTROLLED' ? '4' : '3'}. You pay only after it is approved.'),
                            TextButton(
                              style: TextButton.styleFrom(padding: EdgeInsets.zero),
                              onPressed: () => context.push('/info/prescriptions'),
                              child: const Text('How prescriptions work'),
                            ),
                          ],
                        ),
                      ),
                    ],
                    if (cheaper.isNotEmpty) ...[
                      const SizedBox(height: 12),
                      AlertBox(
                        tone: AlertTone.success,
                        title: 'Same medicine, lower price',
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            for (final a in cheaper)
                              InkWell(
                                onTap: () => context.push('/product/${a.slug}'),
                                child: Padding(
                                  padding: const EdgeInsets.symmetric(vertical: 2),
                                  child: Text('${a.name} ${a.strength ?? ''}, ${a.packSize}: ${naira(a.priceKobo)}', style: const TextStyle(decoration: TextDecoration.underline)),
                                ),
                              ),
                          ],
                        ),
                      ),
                    ],
                    const SizedBox(height: 22),
                    Text('Product Information', style: GoogleFonts.plusJakartaSans(fontSize: 16, fontWeight: FontWeight.w800)),
                    const SizedBox(height: 6),
                    Text(p.description, style: const TextStyle(color: AppColors.inkSoft, height: 1.55)),
                    const SizedBox(height: 10),
                    for (final (title, body) in sections) ...[
                      const Divider(height: 1, color: AppColors.line),
                      Theme(
                        data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
                        child: ExpansionTile(
                          tilePadding: EdgeInsets.zero,
                          title: Text(title, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14.5)),
                          childrenPadding: const EdgeInsets.only(bottom: 14),
                          expandedAlignment: Alignment.topLeft,
                          children: [Text(body, style: const TextStyle(color: AppColors.inkSoft, height: 1.55))],
                        ),
                      ),
                    ],
                    const Divider(height: 1, color: AppColors.line),
                    const SizedBox(height: 18),
                    Panel(
                      child: Column(
                        children: [
                          _Fact(Icons.local_shipping_outlined, 'Delivery in Kano ${kano != null ? naira(kano.feeKobo) : ''}', '${kano?.etaLabel ?? ''}. Nationwide 2–5 days.'),
                          const _Fact(Icons.storefront_outlined, 'Free pickup', 'Ready in about 1 hour at our Kano store.'),
                          const _Fact(Icons.replay_outlined, '48-hour returns', 'For wrong, damaged or expired items.'),
                        ],
                      ),
                    ),
                    const SizedBox(height: 10),
                    MenuRow(icon: Icons.support_agent_rounded, title: 'Questions about ${p.name}?', subtitle: 'Ask a pharmacist. It is free.', onTap: () => context.push('/support')),
                    const SizedBox(height: 10),
                    const Text(
                      'Information on this page is for general guidance and does not replace advice from your doctor or pharmacist.',
                      style: TextStyle(fontSize: 12, color: AppColors.inkMuted),
                    ),
                  ],
                ),
              ),
              if (widget.alternatives.isNotEmpty) ...[
                Padding(padding: const EdgeInsets.fromLTRB(16, 6, 16, 0), child: SectionHeader('Other brands of ${p.genericName}')),
                ProductRow(widget.alternatives),
              ],
              if (widget.related.isNotEmpty) ...[Padding(padding: const EdgeInsets.fromLTRB(16, 22, 16, 0), child: SectionHeader('More in ${p.categoryName}')), ProductRow(widget.related)],
              const SizedBox(height: 24),
            ],
          ),
        ),
        SafeArea(
          top: false,
          child: Container(
            padding: const EdgeInsets.fromLTRB(16, 10, 16, 10),
            decoration: const BoxDecoration(
              color: Colors.white,
              border: Border(top: BorderSide(color: AppColors.line)),
            ),
            child: SizedBox(
              width: double.infinity,
              child: p.inStock
                  ? FilledButton.icon(onPressed: _add, icon: const Icon(Icons.shopping_cart_outlined), label: Text(_qty > 1 ? 'Add $_qty to cart' : 'Add to cart'))
                  : OutlinedButton.icon(onPressed: () => openLink(Site.whatsapp), icon: const Icon(Icons.chat_outlined), label: const Text('Out of stock: ask about availability')),
            ),
          ),
        ),
      ],
    );
  }
}

class _Fact extends StatelessWidget {
  const _Fact(this.icon, this.title, this.body);
  final IconData icon;
  final String title, body;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 6),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, color: AppColors.brand600, size: 20),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
              Text(body, style: const TextStyle(color: AppColors.inkMuted, fontSize: 13)),
            ],
          ),
        ),
      ],
    ),
  );
}
