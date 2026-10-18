import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
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

class ProductScreen extends StatelessWidget {
  const ProductScreen({super.key, required this.slug});
  final String slug;

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Product')),
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

  @override
  Widget build(BuildContext context) {
    final p = widget.p;
    final cheaper = widget.alternatives.where((a) => a.priceKobo < p.priceKobo && a.inStock).toList();
    final kano = context.watch<StoreState>().info?.zones.where((z) => z.code == 'KANO').firstOrNull;
    return Column(children: [
      Expanded(
        child: ListView(children: [
          Stack(children: [
            ProductArt(name: p.brand, strength: p.strength, form: p.packSize, icon: p.icon, size: ArtSize.lg),
            Positioned(left: 12, top: 12, child: Row(children: [RxBadge(p.rxStatus), if (p.coldChain) const Padding(padding: EdgeInsets.only(left: 6), child: ColdChainBadge())])),
          ]),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(p.brand.toUpperCase(), style: const TextStyle(color: AppColors.brand700, fontWeight: FontWeight.w700, fontSize: 12, letterSpacing: 0.6)),
              const SizedBox(height: 4),
              Text('${p.name}${p.strength != null ? ' ${p.strength}' : ''}', style: Theme.of(context).textTheme.headlineSmall),
              const SizedBox(height: 4),
              Text('${p.genericName} · ${p.dosageForm} · ${p.packSize}', style: const TextStyle(color: AppColors.inkMuted)),
              const SizedBox(height: 14),
              Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
                Text(naira(p.priceKobo), style: Theme.of(context).textTheme.headlineSmall),
                if (p.discountPercent > 0) ...[
                  const SizedBox(width: 8),
                  Text(naira(p.compareAtKobo!), style: const TextStyle(color: AppColors.inkMuted, decoration: TextDecoration.lineThrough, fontSize: 16)),
                ],
              ]),
              const SizedBox(height: 4),
              Wrap(spacing: 12, children: [
                Text(p.inStock ? (p.lowStock ? 'Low stock, order soon' : 'In stock') : 'Out of stock',
                    style: TextStyle(fontWeight: FontWeight.w600, color: p.inStock ? (p.lowStock ? AppColors.orange800 : AppColors.care700) : AppColors.brand700)),
                if (p.nextExpiry != null) Text('Expiry no earlier than ${fmtDate(p.nextExpiry).split(' ').skip(1).join(' ')}', style: const TextStyle(color: AppColors.inkMuted)),
              ]),
              if (p.rxStatus != 'OTC') ...[
                const SizedBox(height: 16),
                AlertBox(
                  tone: AlertTone.warning,
                  title: rxLabel[p.rxStatus],
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    if (p.rxStatus == 'CONTROLLED') const Text('1. Verify your identity once (about 2 minutes).'),
                    Text('${p.rxStatus == 'CONTROLLED' ? '2' : '1'}. Add to cart and upload your prescription at checkout.'),
                    Text('${p.rxStatus == 'CONTROLLED' ? '3' : '2'}. A pharmacist reviews it, usually within 2 working hours.'),
                    Text('${p.rxStatus == 'CONTROLLED' ? '4' : '3'}. You pay only after it\'s approved.'),
                    TextButton(style: TextButton.styleFrom(padding: EdgeInsets.zero), onPressed: () => context.push('/info/prescriptions'), child: const Text('How prescriptions work')),
                  ]),
                ),
              ],
              if (cheaper.isNotEmpty) ...[
                const SizedBox(height: 12),
                AlertBox(
                  tone: AlertTone.success,
                  title: 'Same medicine, lower price',
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    for (final a in cheaper)
                      InkWell(onTap: () => context.push('/product/${a.slug}'), child: Padding(padding: const EdgeInsets.symmetric(vertical: 2), child: Text('${a.name} ${a.strength ?? ''}, ${a.packSize}: ${naira(a.priceKobo)}', style: const TextStyle(decoration: TextDecoration.underline)))),
                  ]),
                ),
              ],
              const SizedBox(height: 16),
              CardBox(
                child: Column(children: [
                  _Fact(Icons.local_shipping_outlined, 'Delivery in Kano ${kano != null ? naira(kano.feeKobo) : ''}', '${kano?.etaLabel ?? ''}. Nationwide 2–5 days.'),
                  _Fact(Icons.storefront_outlined, 'Free pickup', 'Ready in about 1 hour at our Kano store.'),
                  _Fact(Icons.verified_outlined, 'Genuine product', 'Supplied by ${p.manufacturer ?? p.brand} via licensed distributors.'),
                  _Fact(Icons.replay_outlined, '48-hour returns', 'For wrong, damaged or expired items.'),
                ]),
              ),
              const SizedBox(height: 8),
              for (final (title, body) in [('About this product', p.description), ('How to use', p.usage), ('Warnings & side effects', p.warnings), ('Storage', p.storage)])
                ExpansionTile(
                  tilePadding: EdgeInsets.zero,
                  initiallyExpanded: title == 'About this product',
                  title: Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
                  childrenPadding: const EdgeInsets.only(bottom: 12),
                  expandedAlignment: Alignment.topLeft,
                  children: [Text(body, style: const TextStyle(color: AppColors.inkSoft, height: 1.55))],
                ),
              const SizedBox(height: 8),
              CardBox(
                onTap: () => openLink(Site.whatsapp),
                child: Row(children: [
                  const Icon(Icons.chat_outlined, color: AppColors.care600),
                  const SizedBox(width: 12),
                  Expanded(child: Text('Questions about ${p.name}? Ask a pharmacist on WhatsApp. It\'s free.')),
                ]),
              ),
              const SizedBox(height: 10),
              const Text("Information on this page is for general guidance and doesn't replace advice from your doctor or pharmacist.", style: TextStyle(fontSize: 12, color: AppColors.inkMuted)),
            ]),
          ),
          if (widget.alternatives.isNotEmpty) ...[
            Padding(padding: const EdgeInsets.symmetric(horizontal: 16), child: SectionTitle('Other brands of ${p.genericName}', eyebrow: 'Same active ingredient')),
            ProductRow(widget.alternatives),
          ],
          if (widget.related.isNotEmpty) ...[
            Padding(padding: const EdgeInsets.fromLTRB(16, 20, 16, 0), child: SectionTitle('More in ${p.categoryName}', eyebrow: 'You may also need')),
            ProductRow(widget.related),
          ],
          const SizedBox(height: 24),
        ]),
      ),
      SafeArea(
        top: false,
        child: Container(
          padding: const EdgeInsets.fromLTRB(16, 10, 16, 10),
          decoration: const BoxDecoration(color: Colors.white, border: Border(top: BorderSide(color: AppColors.border))),
          child: p.inStock
              ? Row(children: [
                  QuantityStepper(value: _qty, max: p.stockAvailable.clamp(1, 50), onChanged: (v) => setState(() => _qty = v)),
                  const SizedBox(width: 12),
                  Expanded(
                    child: FilledButton.icon(
                      onPressed: () {
                        context.read<CartState>().add(p.id, CartState.snapshotOf(p), _qty);
                        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                          behavior: SnackBarBehavior.floating,
                          content: Text('$_qty × ${p.name} added to your cart'),
                          action: SnackBarAction(label: 'View cart', onPressed: () => context.go('/cart')),
                        ));
                      },
                      icon: const Icon(Icons.shopping_bag_outlined),
                      label: const Text('Add to cart'),
                    ),
                  ),
                ])
              : OutlinedButton.icon(onPressed: () => openLink(Site.whatsapp), icon: const Icon(Icons.chat_outlined), label: const Text('Out of stock: ask about availability')),
        ),
      ),
    ]);
  }
}

class _Fact extends StatelessWidget {
  const _Fact(this.icon, this.title, this.body);
  final IconData icon;
  final String title, body;
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 6),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Icon(icon, color: AppColors.brand600, size: 20),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(title, style: const TextStyle(fontWeight: FontWeight.w700)), Text(body, style: const TextStyle(color: AppColors.inkMuted, fontSize: 13))])),
        ]),
      );
}
