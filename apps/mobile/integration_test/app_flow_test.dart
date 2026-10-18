// End-to-end test against a running API, across customer, pharmacist and rider.
//
//   flutter test integration_test/app_flow_test.dart \
//     --dart-define=CUSTOMER_EMAIL=... --dart-define=CUSTOMER_PASSWORD=... \
//     --dart-define=PHARMACIST_EMAIL=... --dart-define=PHARMACIST_PASSWORD=... \
//     --dart-define=RIDER_EMAIL=... --dart-define=RIDER_PASSWORD=...
//
// Use the local seed accounts from apps/api/.env; never real accounts.
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:integration_test/integration_test.dart';
import 'package:mgk_pharmacy/core/api.dart';
import 'package:mgk_pharmacy/main.dart';
import 'package:mgk_pharmacy/state/auth_state.dart';
import 'package:mgk_pharmacy/state/cart_state.dart';
import 'package:mgk_pharmacy/state/store_state.dart';

const customerEmail = String.fromEnvironment('CUSTOMER_EMAIL');
const customerPassword = String.fromEnvironment('CUSTOMER_PASSWORD');
const pharmacistEmail = String.fromEnvironment('PHARMACIST_EMAIL');
const pharmacistPassword = String.fromEnvironment('PHARMACIST_PASSWORD');
const riderEmail = String.fromEnvironment('RIDER_EMAIL');
const riderPassword = String.fromEnvironment('RIDER_PASSWORD');

/// Pumps until [finder] matches (network calls are real, so we poll instead of pumpAndSettle).
Future<void> waitFor(WidgetTester t, Finder finder, {Duration timeout = const Duration(seconds: 40)}) async {
  final end = DateTime.now().add(timeout);
  while (DateTime.now().isBefore(end)) {
    await t.pump(const Duration(milliseconds: 250));
    if (finder.evaluate().isNotEmpty) return;
  }
  // Show what is on screen to make failures easy to diagnose (password fields are obscured, so never shown).
  final visible = find.byType(Text).evaluate().map((e) => (e.widget as Text).data).whereType<String>().where((s) => s.trim().isNotEmpty).take(25).join(' | ');
  debugPrint('SCREEN: $visible');
  throw TestFailure('Timed out waiting for $finder');
}

Future<void> tapText(WidgetTester t, String text) async {
  final f = find.text(text).last;
  await t.ensureVisible(f);
  await t.pump(const Duration(milliseconds: 300));
  await t.tap(f);
  await t.pump(const Duration(milliseconds: 300));
}

/// Navigates like a deep link (the bottom bar is hidden on pushed screens such as an order page).
Future<void> goTo(WidgetTester t, String location) async {
  GoRouter.of(t.element(find.byType(Scaffold).first)).go(location);
  await t.pump(const Duration(seconds: 1));
}

Future<void> signIn(WidgetTester t, String email, String password) async {
  await waitFor(t, find.text('Welcome back'));
  await t.enterText(find.widgetWithText(TextField, 'Enter your email or phone number'), email);
  await t.enterText(find.widgetWithText(TextField, 'Enter your password'), password);
  await tapText(t, 'Sign In');
}

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('customer orders, pharmacist dispatches, rider receives', (t) async {
    expect(customerEmail.isNotEmpty && pharmacistEmail.isNotEmpty && riderEmail.isNotEmpty, true, reason: 'Pass test accounts with --dart-define');
    await api.saveToken(null);
    final auth = AuthState()..load();
    final cart = CartState();
    await cart.load();
    cart.clear();
    final store = StoreState()..load();
    await t.pumpWidget(MgkApp(auth: auth, cart: cart, store: store));

    // ---- Customer ----
    await waitFor(t, find.text('Shop by Category'));
    await tapText(t, 'Account');
    await waitFor(t, find.text('Your pharmacy, in your pocket'));
    await tapText(t, 'Sign in');
    await signIn(t, customerEmail, customerPassword);
    await waitFor(t, find.text('Shop by Category'));
    expect(auth.user?.role, 'CUSTOMER');

    await tapText(t, 'Shop');
    await waitFor(t, find.byType(TextField));
    await t.enterText(find.byType(TextField).first, 'panadol');
    await t.testTextInput.receiveAction(TextInputAction.search);
    await waitFor(t, find.text('Add to cart'));
    await t.tap(find.text('Add to cart').first);
    await t.pump(const Duration(milliseconds: 500));
    expect(cart.count, 1);

    await goTo(t, '/cart'); // the cart now lives behind the header icon
    await waitFor(t, find.text('Proceed to checkout'));
    await t.pump(const Duration(seconds: 5)); // live quote, and let the 'added to cart' snackbar clear
    await tapText(t, 'Proceed to checkout');
    await waitFor(t, find.text('Delivery Address'));
    await t.pump(const Duration(seconds: 2));
    // Checkout is a long, lazily built list: scroll each control into view before tapping it.
    final list = find.byType(Scrollable).first;
    await t.scrollUntilVisible(find.text('Bank Transfer'), 300, scrollable: list);
    await tapText(t, 'Bank Transfer');
    final agree = find.byType(CheckboxListTile).last;
    await t.scrollUntilVisible(agree, 300, scrollable: list);
    await t.tap(agree);
    await t.pump(const Duration(milliseconds: 300));
    await t.tap(find.textContaining('Place Order'));
    await waitFor(t, find.text('Complete your bank transfer'), timeout: const Duration(seconds: 40));
    final orderTitle = find.textContaining('#MGK-');
    final orderNumber = (t.widget<Text>(orderTitle.first)).data!.replaceFirst('#', '');
    debugPrint('PLACED $orderNumber');

    await auth.logout();
    await t.pump(const Duration(seconds: 1));
    await goTo(t, '/account');
    // ---- Pharmacist ----
    await waitFor(t, find.text('Your pharmacy, in your pocket'));
    await tapText(t, 'Sign in');
    await signIn(t, pharmacistEmail, pharmacistPassword);
    await waitFor(t, find.text('WORK QUEUES'));
    expect(auth.user?.isStaff, true);
    debugPrint('PHARMACIST dashboard OK');

    final tile = find.text(orderNumber);
    await t.scrollUntilVisible(tile, 300, scrollable: find.byType(Scrollable).first);
    await t.tap(tile.first);
    await waitFor(t, find.text('Confirm payment received'));
    await tapText(t, 'Confirm payment received');
    await waitFor(t, find.text('Send out for delivery'));
    await t.pump(const Duration(seconds: 2)); // riders list
    final riderDropdown = find.widgetWithText(DropdownButtonFormField<String>, 'Rider');
    await t.scrollUntilVisible(riderDropdown, 200, scrollable: find.byType(Scrollable).first);
    await t.tap(riderDropdown);
    await t.pump(const Duration(seconds: 1));
    await t.tap(find.textContaining('(').last);
    await t.pump(const Duration(milliseconds: 500));
    await tapText(t, 'Send out for delivery');
    await waitFor(t, find.text('Delivery rider'), timeout: const Duration(seconds: 30));
    debugPrint('DISPATCHED with live map');

    await auth.logout();
    await t.pump(const Duration(seconds: 1));
    await goTo(t, '/account');
    // ---- Rider ----
    await waitFor(t, find.text('Your pharmacy, in your pocket'));
    await tapText(t, 'Sign in');
    await signIn(t, riderEmail, riderPassword);
    await waitFor(t, find.text('My Deliveries'));
    await waitFor(t, find.text('ACTIVE DELIVERIES')); // the list loads after the title
    for (var i = 0; i < 12 && find.text(orderNumber).evaluate().isEmpty; i++) {
      await t.drag(find.byType(Scrollable).first, const Offset(0, -400), warnIfMissed: false);
      await t.pump(const Duration(milliseconds: 600));
    }
    expect(find.text(orderNumber), findsWidgets);
    expect(find.text('Start trip: share my location'), findsWidgets);
    debugPrint('RIDER sees $orderNumber');

    await auth.logout();
  });
}
