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
                        SizedBox(height: small ? 3 : 8),
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

/// Height a [ProductCard] needs at [width]: square artwork plus the text block, which grows with
/// the phone's font size setting (a fixed aspect ratio overflowed on phones with larger text).
double productCardHeight(BuildContext context, double width) {
  const fixed = 21 + 3 + 2 + 8 + 8 + 36 + 8; // paddings, gaps, button, card margin
  const text = 13.0 + 34 + 15 + 21 + 15; // category, 2-line name, generic, price, "only a few left"
  return width - 8 + fixed + MediaQuery.textScalerOf(context).scale(text) + 4;
}

class ProductCard extends StatelessWidget {
  const ProductCard(this.p, {super.key});
  final Product p;

  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => context.push('/product/${p.slug}'),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Stack(
              children: [
                ProductArt(name: p.brand, strength: p.strength, icon: p.icon),
                Positioned(
                  left: 8,
                  top: 8,
                  child: Column(
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
                  ),
                ),
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
            Expanded(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(11, 10, 11, 11),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      p.categoryName.toUpperCase(),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 10, color: AppColors.inkMuted, fontWeight: FontWeight.w600, letterSpacing: 0.4),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      '${p.name}${p.strength != null ? ' ${p.strength}' : ''}',
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5, height: 1.25),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${p.genericName} · ${p.packSize}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 11, color: AppColors.inkMuted),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Text(naira(p.priceKobo), style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15.5)),
                        if (p.discountPercent > 0) ...[
                          const SizedBox(width: 6),
                          Text(
                            naira(p.compareAtKobo!),
                            style: const TextStyle(fontSize: 11.5, color: AppColors.inkMuted, decoration: TextDecoration.lineThrough),
                          ),
                        ],
                      ],
                    ),
                    if (p.lowStock)
                      const Text(
                        'Only a few left',
                        style: TextStyle(fontSize: 11, color: AppColors.orange800, fontWeight: FontWeight.w600),
                      ),
                    const Spacer(),
                    const SizedBox(height: 8),
                    SizedBox(
                      width: double.infinity,
                      height: 36,
                      child: FilledButton.icon(
                        style: FilledButton.styleFrom(
                          backgroundColor: AppColors.ink,
                          minimumSize: const Size(10, 36),
                          padding: EdgeInsets.zero,
                          textStyle: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700),
                        ),
                        onPressed: p.inStock
                            ? () {
                                context.read<CartState>().add(p.id, CartState.snapshotOf(p));
                                snack(context, 'Added ${p.name} to your cart');
                              }
                            : null,
                        icon: const Icon(Icons.shopping_bag_outlined, size: 16),
                        label: Text(p.inStock ? 'Add to cart' : 'Out of stock'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Two-column product grid for use inside a CustomScrollView.
class ProductSliverGrid extends StatelessWidget {
  const ProductSliverGrid(this.products, {super.key});
  final List<Product> products;
  @override
  Widget build(BuildContext context) => SliverLayoutBuilder(
    builder: (context, constraints) {
      final columns = (constraints.crossAxisExtent / 240).ceil().clamp(1, 6);
      final tileWidth = (constraints.crossAxisExtent - 12 * (columns - 1)) / columns;
      return SliverGrid(
        gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: columns, mainAxisSpacing: 12, crossAxisSpacing: 12, mainAxisExtent: productCardHeight(context, tileWidth)),
        delegate: SliverChildBuilderDelegate((c, i) => ProductCard(products[i]), childCount: products.length),
      );
    },
  );
}

class ProductRow extends StatelessWidget {
  const ProductRow(this.products, {super.key});
  final List<Product> products;
  @override
  Widget build(BuildContext context) => SizedBox(
    height: productCardHeight(context, 172),
    child: ListView.separated(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      itemCount: products.length,
      separatorBuilder: (_, _) => const SizedBox(width: 12),
      itemBuilder: (c, i) => SizedBox(width: 172, child: ProductCard(products[i])),
    ),
  );
}
