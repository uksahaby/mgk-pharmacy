import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../../core/api.dart';
import '../../widgets/common.dart';

/// Paystack's hosted checkout inside the app. When Paystack redirects back to the order page, we stop the
/// web view and ask our API to verify the payment with Paystack before showing the order (never trust the redirect).
class PaystackScreen extends StatefulWidget {
  const PaystackScreen({super.key, required this.url, required this.number, required this.accessKey});
  final String url;
  final String number;
  final String accessKey;
  @override
  State<PaystackScreen> createState() => _PaystackScreenState();
}

class _PaystackScreenState extends State<PaystackScreen> {
  late final WebViewController _controller;
  int _progress = 0;
  bool _verifying = false;

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setNavigationDelegate(NavigationDelegate(
        onProgress: (p) => setState(() => _progress = p),
        onNavigationRequest: (req) {
          final uri = Uri.tryParse(req.url);
          final reference = uri?.queryParameters['reference'] ?? uri?.queryParameters['trxref'];
          if (uri != null && uri.path.contains('/order/') && reference != null) {
            _verify(reference);
            return NavigationDecision.prevent;
          }
          return NavigationDecision.navigate;
        },
      ))
      ..loadRequest(Uri.parse(widget.url));
  }

  Future<void> _verify(String reference) async {
    if (_verifying) return;
    setState(() => _verifying = true);
    try {
      final res = await api.get('/orders/${widget.number}', query: {'key': widget.accessKey, 'verify': '1', 'reference': reference});
      final paid = (res['order'] as Map)['paymentStatus'] == 'PAID';
      if (mounted) {
        snack(context, paid ? 'Payment confirmed. Thank you!' : 'We\'re confirming your payment. Your order page will update shortly.');
        Navigator.of(context).pop(paid);
      }
    } catch (_) {
      if (mounted) Navigator.of(context).pop(false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(
          title: const Text('Secure payment'),
          leading: IconButton(icon: const Icon(Icons.close), tooltip: 'Close payment', onPressed: () => Navigator.of(context).pop(false)),
          bottom: _progress < 100 ? PreferredSize(preferredSize: const Size.fromHeight(3), child: LinearProgressIndicator(value: _progress / 100)) : null,
        ),
        body: _verifying
            ? const Center(child: Column(mainAxisSize: MainAxisSize.min, children: [CircularProgressIndicator(), SizedBox(height: 16), Text('Confirming your payment…')]))
            : WebViewWidget(controller: _controller),
      );
}
