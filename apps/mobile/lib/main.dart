import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import 'core/theme.dart';
import 'router.dart';
import 'state/auth_state.dart';
import 'state/cart_state.dart';
import 'state/store_state.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(statusBarColor: Colors.transparent, statusBarIconBrightness: Brightness.dark));
  final auth = AuthState()..load();
  final cart = CartState()..load();
  final store = StoreState()..load();
  runApp(MgkApp(auth: auth, cart: cart, store: store));
}

class MgkApp extends StatefulWidget {
  const MgkApp({super.key, required this.auth, required this.cart, required this.store});
  final AuthState auth;
  final CartState cart;
  final StoreState store;

  @override
  State<MgkApp> createState() => _MgkAppState();
}

class _MgkAppState extends State<MgkApp> {
  late final GoRouter _router = buildRouter(widget.auth);

  @override
  Widget build(BuildContext context) => MultiProvider(
        providers: [
          ChangeNotifierProvider.value(value: widget.auth),
          ChangeNotifierProvider.value(value: widget.cart),
          ChangeNotifierProvider.value(value: widget.store),
        ],
        child: MaterialApp.router(
          title: 'MGK Pharmacy',
          debugShowCheckedModeBanner: false,
          theme: buildTheme(),
          routerConfig: _router,
          // Dark status-bar icons on the white screens; the red splash sets its own light ones.
          builder: (context, child) => AnnotatedRegion<SystemUiOverlayStyle>(
            value: const SystemUiOverlayStyle(statusBarColor: Colors.transparent, statusBarIconBrightness: Brightness.dark, statusBarBrightness: Brightness.light),
            child: child!,
          ),
        ),
      );
}
