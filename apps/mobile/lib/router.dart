import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import 'core/theme.dart';
import 'screens/account/account_screens.dart';
import 'screens/admin/admin_catalog.dart';
import 'screens/admin/admin_home.dart';
import 'screens/admin/admin_orders.dart';
import 'screens/admin/admin_people.dart';
import 'screens/admin/admin_reviews.dart';
import 'screens/auth/auth_screens.dart';
import 'screens/rider/rider_screen.dart';
import 'screens/store/cart_screen.dart';
import 'screens/store/checkout_screen.dart';
import 'screens/store/home_screen.dart';
import 'screens/store/info_screens.dart';
import 'screens/store/order_screen.dart';
import 'screens/store/product_screen.dart';
import 'screens/store/shop_screen.dart';
import 'state/auth_state.dart';
import 'state/cart_state.dart';
import 'widgets/files.dart';

/// Default landing page for a signed-in user, by role (same as the website's homeFor).
String homeFor(AuthState auth) {
  final u = auth.user;
  if (u == null) return '/home';
  if (u.isStaff) return '/admin';
  if (u.isRider) return '/rider';
  return '/home';
}

GoRouter buildRouter(AuthState auth) {
  String? guard(BuildContext context, GoRouterState state) {
    final loc = state.matchedLocation;
    if (!auth.ready) return loc == '/splash' ? null : '/splash';
    final user = auth.user;
    if (loc == '/splash') return homeFor(auth);
    if (user != null && user.mustChangePassword && loc != '/change-password') return '/change-password';
    final next = Uri.encodeComponent(state.uri.toString());
    final needsAccount = loc.startsWith('/account') && loc != '/account';
    if ((needsAccount || loc.startsWith('/admin') || loc.startsWith('/rider')) && user == null) return '/login?next=$next';
    if (loc.startsWith('/admin') && user != null && !user.isStaff) return homeFor(auth);
    if (loc.startsWith('/rider') && user != null && !user.isRider) return homeFor(auth);
    if ((loc == '/login' || loc == '/register') && user != null) return state.uri.queryParameters['next'] ?? homeFor(auth);
    return null;
  }

  return GoRouter(
    initialLocation: '/splash',
    refreshListenable: auth,
    redirect: guard,
    routes: [
      GoRoute(path: '/splash', builder: (_, _) => const _Splash()),
      StatefulShellRoute.indexedStack(
        builder: (context, state, shell) => _CustomerShell(shell: shell),
        branches: [
          StatefulShellBranch(routes: [GoRoute(path: '/home', builder: (_, _) => const HomeScreen())]),
          StatefulShellBranch(routes: [
            GoRoute(path: '/shop', builder: (_, s) => ShopScreen(query: s.uri.queryParameters['q'], category: s.uri.queryParameters['category'])),
          ]),
          StatefulShellBranch(routes: [GoRoute(path: '/cart', builder: (_, _) => const CartScreen())]),
          StatefulShellBranch(routes: [GoRoute(path: '/account', builder: (_, _) => const AccountHomeScreen())]),
        ],
      ),
      GoRoute(path: '/product/:slug', builder: (_, s) => ProductScreen(slug: s.pathParameters['slug']!)),
      GoRoute(path: '/category/:slug', builder: (_, s) => ShopScreen(category: s.pathParameters['slug'], standalone: true)),
      GoRoute(path: '/search', builder: (_, s) => ShopScreen(query: s.uri.queryParameters['q'], standalone: true)),
      GoRoute(path: '/checkout', builder: (_, _) => const CheckoutScreen()),
      GoRoute(
        path: '/order/:number',
        builder: (_, s) => OrderScreen(number: s.pathParameters['number']!, accessKey: s.uri.queryParameters['key'], justPlaced: s.uri.queryParameters['new'] == '1'),
      ),
      GoRoute(path: '/track', builder: (_, _) => const TrackOrderScreen()),
      GoRoute(path: '/login', builder: (_, s) => LoginScreen(next: s.uri.queryParameters['next'])),
      GoRoute(path: '/register', builder: (_, s) => RegisterScreen(next: s.uri.queryParameters['next'])),
      GoRoute(path: '/change-password', builder: (_, _) => const ChangePasswordScreen()),
      GoRoute(path: '/account/orders', builder: (_, _) => const MyOrdersScreen()),
      GoRoute(path: '/account/prescriptions', builder: (_, _) => const PrescriptionsScreen()),
      GoRoute(path: '/account/verification', builder: (_, _) => const VerificationScreen()),
      GoRoute(path: '/account/addresses', builder: (_, _) => const AddressesScreen()),
      GoRoute(path: '/account/profile', builder: (_, _) => const ProfileScreen()),
      GoRoute(path: '/info/:page', builder: (_, s) => InfoScreen(page: s.pathParameters['page']!)),
      GoRoute(path: '/contact', builder: (_, _) => const ContactScreen()),
      GoRoute(path: '/file', builder: (_, s) => FileViewerScreen(apiPath: s.uri.queryParameters['path']!, title: s.uri.queryParameters['title'] ?? 'Document')),
      GoRoute(path: '/rider', builder: (_, _) => const RiderScreen()),
      GoRoute(path: '/admin', builder: (_, _) => const AdminHomeScreen()),
      GoRoute(path: '/admin/orders', builder: (_, s) => AdminOrdersScreen(status: s.uri.queryParameters['status'], queue: s.uri.queryParameters['queue'])),
      GoRoute(path: '/admin/orders/:number', builder: (_, s) => AdminOrderScreen(number: s.pathParameters['number']!)),
      GoRoute(path: '/admin/prescriptions', builder: (_, _) => const AdminPrescriptionsScreen()),
      GoRoute(path: '/admin/verifications', builder: (_, _) => const AdminVerificationsScreen()),
      GoRoute(path: '/admin/products', builder: (_, s) => AdminProductsScreen(stock: s.uri.queryParameters['stock'], category: s.uri.queryParameters['category'])),
      GoRoute(path: '/admin/products/new', builder: (_, _) => const AdminProductEditScreen()),
      GoRoute(path: '/admin/products/:id', builder: (_, s) => AdminProductEditScreen(id: s.pathParameters['id'])),
      GoRoute(path: '/admin/inventory', builder: (_, _) => const AdminInventoryScreen()),
      GoRoute(path: '/admin/customers', builder: (_, _) => const AdminCustomersScreen()),
      GoRoute(path: '/admin/messages', builder: (_, _) => const AdminMessagesScreen()),
      GoRoute(path: '/admin/staff', builder: (_, _) => const AdminStaffScreen()),
    ],
  );
}

class _Splash extends StatelessWidget {
  const _Splash();
  @override
  Widget build(BuildContext context) => const Scaffold(
        backgroundColor: Colors.white,
        body: Center(child: CircularProgressIndicator()),
      );
}

class _CustomerShell extends StatelessWidget {
  const _CustomerShell({required this.shell});
  final StatefulNavigationShell shell;
  @override
  Widget build(BuildContext context) {
    final count = context.watch<CartState>().count;
    return Scaffold(
      body: shell,
      bottomNavigationBar: NavigationBar(
        selectedIndex: shell.currentIndex,
        onDestinationSelected: (i) => shell.goBranch(i, initialLocation: i == shell.currentIndex),
        destinations: [
          const NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home_rounded, color: AppColors.brand600), label: 'Home'),
          const NavigationDestination(icon: Icon(Icons.search), selectedIcon: Icon(Icons.search, color: AppColors.brand600), label: 'Shop'),
          NavigationDestination(
            icon: Badge(isLabelVisible: count > 0, label: Text('$count'), backgroundColor: AppColors.brand600, child: const Icon(Icons.shopping_bag_outlined)),
            selectedIcon: Badge(isLabelVisible: count > 0, label: Text('$count'), backgroundColor: AppColors.brand600, child: const Icon(Icons.shopping_bag, color: AppColors.brand600)),
            label: 'Cart',
          ),
          const NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person, color: AppColors.brand600), label: 'Account'),
        ],
      ),
    );
  }
}
