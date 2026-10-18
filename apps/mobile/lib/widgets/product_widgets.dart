import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../core/format.dart';
import '../core/models.dart';
import '../core/theme.dart';
import '../state/cart_state.dart';
import 'common.dart';

/// Medicine-pack artwork, the same design as the website's ProductArt.
class ProductArt extends StatelessWidget {
  const ProductArt({super.key, required this.name, this.strength, this.form, required this.icon, this.size = ArtSize.md});
  final String name;
  final String? strength;
  final String? form;
  final String icon;
  final ArtSize size;

  @override
  Widget build(BuildContext context) {
    final tone = toneFor(icon);
    final big = size == ArtSize.lg;
    final small = size == ArtSize.sm;
    return AspectRatio(
      aspectRatio: 1,
      child: Container(
        decoration: BoxDecoration(
          gradient: RadialGradient(center: const Alignment(-0.6, -0.8), radius: 1.4, colors: [tone.from, tone.to]),
        ),
        alignment: Alignment.center,
        child: FractionallySizedBox(
          widthFactor: big ? 0.54 : 0.58,
          heightFactor: 0.62,
          child: Transform.rotate(
            angle: -0.07,
            child: Container(
              padding: EdgeInsets.all(
                big
                    ? 18
                    : small
                    ? 6
                    : 11,
              ),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                boxShadow: const [BoxShadow(color: Color(0x2E0F172A), blurRadius: 24, offset: Offset(0, 12))],
              ),
              // Thumbnails are too small for text: show the category icon only.
              child: small
                  ? Center(child: Icon(categoryIcon(icon), size: 14, color: tone.fg))
                  : Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          padding: EdgeInsets.all(small ? 3 : 5),
                          decoration: BoxDecoration(color: tone.bg, borderRadius: BorderRadius.circular(7)),
                          child: Icon(
                            categoryIcon(icon),
                            size: big
                                ? 22
                                : small
                                ? 10
                                : 15,
                            color: tone.fg,
                          ),
                        ),
                        const Spacer(),
                        Text(
                          name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.plusJakartaSans(
                            fontWeight: FontWeight.w800,
                            fontSize: big
                                ? 22
                                : small
                                ? 8
                                : 13,
                            color: AppColors.ink,
                            height: 1.1,
                          ),
                        ),
                        if (strength != null && !small)
                          Text(
                            strength!,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(color: tone.fg, fontWeight: FontWeight.w700, fontSize: big ? 15 : 10.5),
                          ),
                        if (form != null && big)
                          Padding(
                            padding: const EdgeInsets.only(top: 4),
                            child: Text(
                              form!.toUpperCase(),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(fontSize: 11, letterSpacing: 1, color: AppColors.inkMuted),
                            ),
                          ),
                        SizedBox(height: small ? 3 : (big ? 8 : 5)),
                        Container(
                          height: 4,
                          decoration: BoxDecoration(color: tone.bg, borderRadius: BorderRadius.circular(9)),
                        ),
                      ],
                    ),
            ),
          ),
        ),
      ),
    );
  }
}

enum ArtSize { sm, md, lg }

void addToCart(BuildContext context, Product p, {int quantity = 1}) {
  context.read<CartState>().add(p.id, CartState.snapshotOf(p), quantity);
  snack(context, 'Added ${p.name} to your cart');
}

/// Badges shown over product art: Rx / controlled, keep cold, discount.
class _ArtBadges extends StatelessWidget {
  const _ArtBadges(this.p);
  final Product p;
  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      RxBadge(p.rxStatus),
      if (p.coldChain) const Padding(padding: EdgeInsets.only(top: 4), child: ColdChainBadge()),
      if (p.discountPercent > 0)
        Padding(
          padding: const EdgeInsets.only(top: 4),
          child: Pill('-${p.discountPercent}%', bg: AppColors.brand600, fg: Colors.white),
        ),
    ],
  );
}

/// Product picture in a soft rounded frame, with an "out of stock" veil.
class ProductThumb extends StatelessWidget {
  const ProductThumb(this.p, {super.key, this.size = ArtSize.md, this.badges = true});
  final Product p;
  final ArtSize size;
  final bool badges;
  @override
  Widget build(BuildContext context) => ClipRRect(
    borderRadius: BorderRadius.circular(12),
    child: Stack(
      children: [
        ProductArt(name: p.brand, strength: size == ArtSize.sm ? null : p.strength, icon: p.icon, size: size),
        if (badges) Positioned(left: 6, top: 6, child: _ArtBadges(p)),
        if (!p.inStock)
          Positioned.fill(
            child: Container(
              color: Colors.white.withValues(alpha: 0.6),
              alignment: Alignment.center,
              child: const Pill('Out of stock', bg: AppColors.ink, fg: Colors.white),
            ),
          ),
      ],
    ),
  );
}

/// Compact product card for horizontal rows ("Popular Products"): picture, name, price and a round add button.
class ProductCard extends StatelessWidget {
  const ProductCard(this.p, {super.key});
  final Product p;

  @override
  Widget build(BuildContext context) => Material(
    color: Colors.white,
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(14),
      side: const BorderSide(color: AppColors.line),
    ),
    clipBehavior: Clip.antiAlias,
    child: InkWell(
      onTap: () => context.push('/product/${p.slug}'),
      child: Padding(
        padding: const EdgeInsets.all(8),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ProductThumb(p),
            const SizedBox(height: 8),
            Text(
              p.name,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13, height: 1.25),
            ),
            Text(
              p.categoryName,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 11.5, color: AppColors.inkMuted),
            ),
            const Spacer(),
            Row(
              children: [
                Expanded(
                  child: Text(naira(p.priceKobo), style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                ),
                SizedBox(
                  width: 32,
                  height: 32,
                  child: IconButton.filled(
                    padding: EdgeInsets.zero,
                    style: IconButton.styleFrom(
                      backgroundColor: AppColors.brand600,
                      disabledBackgroundColor: AppColors.slate100,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(9)),
                    ),
                    tooltip: p.inStock ? 'Add to cart' : 'Out of stock',
                    onPressed: p.inStock ? () => addToCart(context, p) : null,
                    icon: const Icon(Icons.add_rounded, size: 20, color: Colors.white),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    ),
  );
}

/// Shop list row: picture on the left, then name, category, price and an "Add to cart" button.
class ProductListTile extends StatelessWidget {
  const ProductListTile(this.p, {super.key});
  final Product p;
  @override
  Widget build(BuildContext context) => InkWell(
    onTap: () => context.push('/product/${p.slug}'),
    child: Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 96,
            child: DecoratedBox(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.line),
              ),
              child: ProductThumb(p, size: ArtSize.sm, badges: false),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${p.name}${p.strength != null ? ' ${p.strength}' : ''}',
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14.5, height: 1.25),
                ),
                const SizedBox(height: 2),
                Text(
                  p.categoryName,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 12, color: AppColors.inkMuted),
                ),
                if (p.rxStatus != 'OTC' || p.coldChain)
                  Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Wrap(spacing: 4, children: [RxBadge(p.rxStatus), if (p.coldChain) const ColdChainBadge()]),
                  ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    Text(naira(p.priceKobo), style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                    if (p.discountPercent > 0) ...[
                      const SizedBox(width: 6),
                      Text(
                        naira(p.compareAtKobo!),
                        style: const TextStyle(fontSize: 12, color: AppColors.inkMuted, decoration: TextDecoration.lineThrough),
                      ),
                    ],
                  ],
                ),
                if (p.lowStock)
                  const Text(
                    'Only a few left',
                    style: TextStyle(fontSize: 11.5, color: AppColors.orange800, fontWeight: FontWeight.w600),
                  ),
                const SizedBox(height: 8),
                SizedBox(
                  height: 34,
                  child: FilledButton(
                    style: FilledButton.styleFrom(
                      minimumSize: const Size(0, 34),
                      padding: const EdgeInsets.symmetric(horizontal: 18),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(9)),
                      textStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
                    ),
                    onPressed: p.inStock ? () => addToCart(context, p) : null,
                    child: Text(p.inStock ? 'Add to cart' : 'Out of stock'),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    ),
  );
}

/// Horizontal row of compact product cards.
class ProductRow extends StatelessWidget {
  const ProductRow(this.products, {super.key});
  final List<Product> products;
  @override
  Widget build(BuildContext context) {
    const width = 156.0;
    // Square art (card width minus padding) plus name, category and price rows; grows with the phone's text size.
    final height = (width - 16) + 16 + 8 + MediaQuery.textScalerOf(context).scale(33 + 15 + 6) + 34;
    return SizedBox(
      height: height,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: products.length,
        separatorBuilder: (_, _) => const SizedBox(width: 12),
        itemBuilder: (c, i) => SizedBox(width: width, child: ProductCard(products[i])),
      ),
    );
  }
}
