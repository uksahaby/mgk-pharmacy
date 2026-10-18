import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../../core/api.dart';
import '../../core/format.dart';
import '../../core/models.dart';
import '../../core/theme.dart';
import '../../state/auth_state.dart';
import '../../state/store_state.dart';
import '../../widgets/common.dart';
import '../../widgets/hero_slider.dart';
import '../../widgets/product_widgets.dart';
import '../../widgets/ui.dart';

String _greeting() {
  final h = DateTime.now().toUtc().add(const Duration(hours: 1)).hour; // Nigerian time
  return h < 12 ? 'Good morning' : (h < 17 ? 'Good afternoon' : 'Good evening');
}

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  Future<(List<Product>, List<Product>)> _load() async {
    final r = await Future.wait([
      api.get('/products', query: {'featured': 'true', 'pageSize': 8}),
      api.get('/products', query: {'category': 'malaria', 'pageSize': 6, 'inStock': 'true'}),
    ]);
    List<Product> ps(Json j) => (j['products'] as List).map((p) => Product(p as Json)).toList();
    return (ps(r[0]), ps(r[1]));
  }

  @override
  Widget build(BuildContext context) {
    final store = context.watch<StoreState>();
    final user = context.watch<AuthState>().user;
    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: RefreshIndicator(
          onRefresh: store.load,
          child: CustomScrollView(
            slivers: [
              SliverToBoxAdapter(child: _Header(user: user)),
              if (user != null && (user.isStaff || user.isRider)) SliverToBoxAdapter(child: _RoleShortcut(user: user)),
              const SliverToBoxAdapter(child: _SearchBar()),
              const SliverPadding(
                padding: EdgeInsets.fromLTRB(16, 16, 16, 0),
                sliver: SliverToBoxAdapter(child: HeroSlider()),
              ),
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 24, 16, 0),
                sliver: SliverToBoxAdapter(
                  child: SectionHeader('Shop by Category', action: 'See all', onAction: () => context.go('/shop')),
                ),
              ),
              SliverPadding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                sliver: SliverGrid(
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 4, mainAxisSpacing: 12, crossAxisSpacing: 10, mainAxisExtent: 96),
                  delegate: SliverChildBuilderDelegate(
                    (c, i) => i < 7 && i < store.categories.length ? _CategoryTile(store.categories[i]) : const _MoreTile(),
                    childCount: store.categories.isEmpty ? 0 : (store.categories.length < 7 ? store.categories.length + 1 : 8),
                  ),
                ),
              ),
              SliverToBoxAdapter(
                child: Loader(
                  load: _load,
                  builder: (context, data, _) => Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (data.$1.isNotEmpty) ...[
                        Padding(
                          padding: const EdgeInsets.fromLTRB(16, 22, 16, 0),
                          child: SectionHeader('Popular Products', action: 'See all', onAction: () => context.go('/shop')),
                        ),
                        ProductRow(data.$1),
                      ],
                      const _PrescriptionCard(),
                      if (data.$2.isNotEmpty) ...[
                        Padding(
                          padding: const EdgeInsets.fromLTRB(16, 22, 16, 0),
                          child: SectionHeader('Stop Malaria', action: 'See all', onAction: () => context.push('/category/malaria')),
                        ),
                        ProductRow(data.$2),
                      ],
                    ],
                  ),
                ),
              ),
              const SliverToBoxAdapter(child: _SupportCard()),
              SliverToBoxAdapter(child: _DeliveryStrip(info: store.info)),
              const SliverToBoxAdapter(child: SizedBox(height: 24)),
            ],
          ),
        ),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({this.user});
  final User? user;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(16, 10, 6, 6),
    child: Row(
      children: [
        InkWell(
          customBorder: const CircleBorder(),
          onTap: () => context.go('/account'),
          child: CircleAvatar(
            radius: 21,
            backgroundColor: AppColors.brand50,
            child: user == null
                ? const Icon(Icons.person_outline_rounded, color: AppColors.brand600)
                : Text(
                    user!.initials,
                    style: const TextStyle(color: AppColors.brand700, fontWeight: FontWeight.w800),
                  ),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('${_greeting()},', style: const TextStyle(color: AppColors.inkMuted, fontSize: 12.5)),
              Text(
                user?.firstName ?? 'Welcome to MGK',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: GoogleFonts.plusJakartaSans(fontSize: 18, fontWeight: FontWeight.w800),
              ),
            ],
          ),
        ),
        IconButton(tooltip: 'Pharmacist support', onPressed: () => context.push('/support'), icon: const Icon(Icons.support_agent_rounded)),
        const CartButton(),
      ],
    ),
  );
}

/// Riders and staff use the same shop as customers; this is their way back to their own tools.
class _RoleShortcut extends StatelessWidget {
  const _RoleShortcut({required this.user});
  final User user;
  @override
  Widget build(BuildContext context) {
    final rider = user.isRider && !user.isStaff;
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 6),
      child: Panel(
        color: AppColors.ink,
        borderColor: AppColors.ink,
        onTap: () => context.push(rider ? '/rider' : '/admin'),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        child: Row(
          children: [
            Icon(rider ? Icons.delivery_dining_rounded : Icons.dashboard_outlined, color: Colors.white),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                rider ? 'My deliveries' : 'Pharmacy dashboard',
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
              ),
            ),
            const Icon(Icons.arrow_forward_rounded, color: Colors.white70, size: 20),
          ],
        ),
      ),
    );
  }
}

class _SearchBar extends StatelessWidget {
  const _SearchBar();
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
    child: InkWell(
      borderRadius: BorderRadius.circular(12),
      onTap: () => context.go('/shop'),
      child: Container(
        height: 48,
        padding: const EdgeInsets.symmetric(horizontal: 14),
        decoration: BoxDecoration(
          color: AppColors.slate50,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.line),
        ),
        child: const Row(
          children: [
            Icon(Icons.search_rounded, color: AppColors.hint),
            SizedBox(width: 10),
            Expanded(
              child: Text('Search medicines & health products', maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(color: AppColors.hint, fontSize: 13.5)),
            ),
          ],
        ),
      ),
    ),
  );
}

class _CategoryTile extends StatelessWidget {
  const _CategoryTile(this.c);
  final Category c;
  @override
  Widget build(BuildContext context) {
    final tone = toneFor(c.icon);
    return InkWell(
      borderRadius: BorderRadius.circular(14),
      onTap: () => context.push('/category/${c.slug}'),
      child: Column(
        children: [
          Container(
            height: 58,
            width: double.infinity,
            decoration: BoxDecoration(color: tone.bg, borderRadius: BorderRadius.circular(14)),
            child: Icon(categoryIcon(c.icon), color: tone.fg, size: 26),
          ),
          const SizedBox(height: 6),
          Text(
            c.name,
            maxLines: 2,
            textAlign: TextAlign.center,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontSize: 11, height: 1.2, fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }
}

class _MoreTile extends StatelessWidget {
  const _MoreTile();
  @override
  Widget build(BuildContext context) => InkWell(
    borderRadius: BorderRadius.circular(14),
    onTap: () => context.go('/shop'),
    child: Column(
      children: [
        Container(
          height: 58,
          width: double.infinity,
          decoration: BoxDecoration(color: AppColors.slate100, borderRadius: BorderRadius.circular(14)),
          child: const Icon(Icons.more_horiz_rounded, color: AppColors.inkSoft, size: 26),
        ),
        const SizedBox(height: 6),
        const Text('More', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600)),
      ],
    ),
  );
}

class _PrescriptionCard extends StatelessWidget {
  const _PrescriptionCard();
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(16, 22, 16, 0),
    child: Panel(
      color: AppColors.brand50,
      borderColor: AppColors.brand100,
      padding: const EdgeInsets.all(16),
      onTap: () => context.go('/prescriptions'),
      child: Row(
        children: [
          const IconBadge(Icons.document_scanner_outlined, size: 48, bg: Colors.white),
          const SizedBox(width: 14),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Have a prescription?', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                SizedBox(height: 2),
                Text('Upload a photo. A pharmacist checks it, usually within 2 hours.', style: TextStyle(color: AppColors.inkSoft, fontSize: 12.5, height: 1.35)),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(color: AppColors.brand600, borderRadius: BorderRadius.circular(10)),
            child: const Icon(Icons.upload_rounded, color: Colors.white, size: 20),
          ),
        ],
      ),
    ),
  );
}

class _SupportCard extends StatelessWidget {
  const _SupportCard();
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(16, 24, 16, 0),
    child: Panel(
      padding: const EdgeInsets.all(16),
      onTap: () => context.push('/support'),
      child: const Row(
        children: [
          IconBadge(Icons.support_agent_rounded, size: 48, bg: AppColors.care50, fg: AppColors.care600),
          SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Not sure what you need?', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                SizedBox(height: 2),
                Text("Chat with a pharmacist. It's free.", style: TextStyle(color: AppColors.inkMuted, fontSize: 12.5)),
              ],
            ),
          ),
          Icon(Icons.chevron_right_rounded, color: AppColors.hint),
        ],
      ),
    ),
  );
}

class _DeliveryStrip extends StatelessWidget {
  const _DeliveryStrip({this.info});
  final StoreInfo? info;
  @override
  Widget build(BuildContext context) {
    if (info == null) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      child: Panel(
        padding: const EdgeInsets.all(16),
        onTap: () => context.push('/info/delivery'),
        child: Row(
          children: [
            const IconBadge(Icons.local_shipping_outlined, size: 48),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Fast & reliable delivery', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                  const SizedBox(height: 2),
                  Text(
                    'Same day in Kano. Free over ${naira(info!.freeDeliveryThresholdKobo)}, or pick up free in store.',
                    style: const TextStyle(color: AppColors.inkMuted, fontSize: 12.5, height: 1.35),
                  ),
                ],
              ),
            ),
            const Icon(Icons.chevron_right_rounded, color: AppColors.hint),
          ],
        ),
      ),
    );
  }
}
