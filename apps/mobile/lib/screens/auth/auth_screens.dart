import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/api.dart';
import '../../core/theme.dart';
import '../../router.dart';
import '../../state/auth_state.dart';
import '../../widgets/common.dart';

class _AuthScaffold extends StatelessWidget {
  const _AuthScaffold({required this.title, required this.subtitle, required this.children});
  final String title, subtitle;
  final List<Widget> children;
  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(),
        body: ListView(padding: const EdgeInsets.fromLTRB(20, 8, 20, 32), children: [
          // ListView stretches children to full width; Align keeps the mark square.
          Align(
            alignment: Alignment.centerLeft,
            child: Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(color: AppColors.brand600, borderRadius: BorderRadius.circular(15)),
              child: const Icon(Icons.add, color: Colors.white, size: 34),
            ),
          ),
          const SizedBox(height: 18),
          Text(title, style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: 6),
          Text(subtitle, style: const TextStyle(color: AppColors.inkMuted, height: 1.45)),
          const SizedBox(height: 22),
          ...children,
        ]),
      );
}

class _PasswordField extends StatefulWidget {
  const _PasswordField({required this.controller, required this.label, this.error, this.hint, this.newPassword = false});
  final TextEditingController controller;
  final String label;
  final String? error, hint;
  final bool newPassword;
  @override
  State<_PasswordField> createState() => _PasswordFieldState();
}

class _PasswordFieldState extends State<_PasswordField> {
  bool _show = false;
  @override
  Widget build(BuildContext context) => TextField(
        controller: widget.controller,
        obscureText: !_show,
        autofillHints: [widget.newPassword ? AutofillHints.newPassword : AutofillHints.password],
        decoration: InputDecoration(
          labelText: widget.label,
          errorText: widget.error,
          helperText: widget.hint,
          suffixIcon: IconButton(icon: Icon(_show ? Icons.visibility_off_outlined : Icons.visibility_outlined), onPressed: () => setState(() => _show = !_show), tooltip: _show ? 'Hide password' : 'Show password'),
        ),
      );
}

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key, this.next});
  final String? next;
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _email = TextEditingController(), _password = TextEditingController();
  bool _busy = false;
  String? _error;

  Future<void> _submit() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    final auth = context.read<AuthState>();
    try {
      await auth.login(_email.text.trim(), _password.text);
      if (!mounted) return;
      final next = widget.next;
      context.go(next != null && next.startsWith('/') ? next : homeFor(auth));
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => _AuthScaffold(
        title: 'Welcome back',
        subtitle: 'Sign in to track orders, manage prescriptions and check out faster. Staff and riders sign in here too.',
        children: [
          AutofillGroup(
            child: Column(children: [
              if (_error != null) Padding(padding: const EdgeInsets.only(bottom: 12), child: AlertBox(tone: AlertTone.error, message: _error)),
              TextField(controller: _email, keyboardType: TextInputType.emailAddress, autofillHints: const [AutofillHints.email], decoration: const InputDecoration(labelText: 'Email address')),
              const SizedBox(height: 12),
              _PasswordField(controller: _password, label: 'Password'),
            ]),
          ),
          const SizedBox(height: 18),
          FilledButton(onPressed: _busy ? null : _submit, child: _busy ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Text('Sign in')),
          const SizedBox(height: 12),
          Row(mainAxisAlignment: MainAxisAlignment.center, children: [
            const Text('New here?'),
            TextButton(onPressed: () => context.pushReplacement('/register${widget.next != null ? '?next=${Uri.encodeComponent(widget.next!)}' : ''}'), child: const Text('Create an account')),
          ]),
          const Text("Forgot your password? Contact us on WhatsApp and we'll help you reset it securely.", textAlign: TextAlign.center, style: TextStyle(fontSize: 12, color: AppColors.inkMuted)),
        ],
      );
}

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key, this.next});
  final String? next;
  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _first = TextEditingController(), _last = TextEditingController(), _email = TextEditingController(), _phone = TextEditingController(), _password = TextEditingController();
  bool _terms = false, _marketing = false, _busy = false;
  String? _error;
  Map<String, String> _fields = {};

  Future<void> _submit() async {
    setState(() {
      _busy = true;
      _error = null;
      _fields = {};
    });
    final auth = context.read<AuthState>();
    try {
      await auth.register({
        'firstName': _first.text.trim(),
        'lastName': _last.text.trim(),
        'email': _email.text.trim(),
        'phone': _phone.text.trim(),
        'password': _password.text,
        'acceptTerms': _terms,
        'marketingOptIn': _marketing,
      });
      if (mounted) context.go(widget.next ?? '/home');
    } on ApiException catch (e) {
      setState(() {
        _error = e.message;
        _fields = e.fields;
      });
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => _AuthScaffold(
        title: 'Create your account',
        subtitle: "It takes under a minute. You'll need an account to order prescription medicines.",
        children: [
          if (_error != null) Padding(padding: const EdgeInsets.only(bottom: 12), child: AlertBox(tone: AlertTone.error, message: _error)),
          Row(children: [
            Expanded(child: TextField(controller: _first, textCapitalization: TextCapitalization.words, decoration: InputDecoration(labelText: 'First name', errorText: _fields['firstName']))),
            const SizedBox(width: 10),
            Expanded(child: TextField(controller: _last, textCapitalization: TextCapitalization.words, decoration: InputDecoration(labelText: 'Last name', errorText: _fields['lastName']))),
          ]),
          const SizedBox(height: 12),
          TextField(controller: _email, keyboardType: TextInputType.emailAddress, decoration: InputDecoration(labelText: 'Email address', errorText: _fields['email'])),
          const SizedBox(height: 12),
          TextField(controller: _phone, keyboardType: TextInputType.phone, decoration: InputDecoration(labelText: 'Mobile number', hintText: '0803 123 4567', helperText: 'WhatsApp-enabled, for order updates.', errorText: _fields['phone'])),
          const SizedBox(height: 12),
          _PasswordField(controller: _password, label: 'Create a password', error: _fields['password'], hint: 'At least 8 characters, with a letter and a number.', newPassword: true),
          CheckboxListTile(
            contentPadding: EdgeInsets.zero,
            controlAffinity: ListTileControlAffinity.leading,
            value: _terms,
            onChanged: (v) => setState(() => _terms = v!),
            title: Wrap(children: [
              const Text('I agree to the '),
              InkWell(onTap: () => context.push('/info/terms'), child: const Text('terms', style: TextStyle(decoration: TextDecoration.underline))),
              const Text(' and '),
              InkWell(onTap: () => context.push('/info/privacy'), child: const Text('privacy policy', style: TextStyle(decoration: TextDecoration.underline))),
            ]),
            subtitle: _fields['acceptTerms'] != null ? Text(_fields['acceptTerms']!, style: const TextStyle(color: AppColors.brand700)) : null,
          ),
          CheckboxListTile(
            contentPadding: EdgeInsets.zero,
            controlAffinity: ListTileControlAffinity.leading,
            value: _marketing,
            onChanged: (v) => setState(() => _marketing = v!),
            title: const Text('Send me occasional health tips and offers (optional). Prescription data is never used for marketing.', style: TextStyle(fontSize: 13)),
          ),
          const SizedBox(height: 8),
          FilledButton(onPressed: _busy ? null : _submit, child: const Text('Create account')),
          Row(mainAxisAlignment: MainAxisAlignment.center, children: [
            const Text('Already have an account?'),
            TextButton(onPressed: () => context.pushReplacement('/login'), child: const Text('Sign in')),
          ]),
        ],
      );
}

/// Shown after signing in with a temporary password from an administrator.
class ChangePasswordScreen extends StatefulWidget {
  const ChangePasswordScreen({super.key});
  @override
  State<ChangePasswordScreen> createState() => _ChangePasswordScreenState();
}

class _ChangePasswordScreenState extends State<ChangePasswordScreen> {
  final _current = TextEditingController(), _next = TextEditingController(), _confirm = TextEditingController();
  bool _busy = false;
  String? _error;
  Map<String, String> _fields = {};

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthState>();
    return _AuthScaffold(
      title: 'Welcome, ${auth.user?.firstName ?? ''}. Choose your password',
      subtitle: 'You signed in with a temporary password from an administrator. Set your own private password to continue.',
      children: [
        if (_error != null) Padding(padding: const EdgeInsets.only(bottom: 12), child: AlertBox(tone: AlertTone.error, message: _error)),
        _PasswordField(controller: _current, label: 'Temporary password'),
        const SizedBox(height: 12),
        _PasswordField(controller: _next, label: 'New password', error: _fields['newPassword'], hint: 'At least 8 characters, with a letter and a number.', newPassword: true),
        const SizedBox(height: 12),
        _PasswordField(controller: _confirm, label: 'Confirm new password', newPassword: true),
        const SizedBox(height: 18),
        FilledButton(
          onPressed: _busy
              ? null
              : () async {
                  if (_next.text != _confirm.text) return setState(() => _error = "The two new passwords don't match.");
                  setState(() {
                    _busy = true;
                    _error = null;
                    _fields = {};
                  });
                  try {
                    await auth.changePassword(_current.text, _next.text);
                    if (context.mounted) context.go(homeFor(auth));
                  } on ApiException catch (e) {
                    setState(() {
                      _error = e.message;
                      _fields = e.fields;
                    });
                  } finally {
                    if (mounted) setState(() => _busy = false);
                  }
                },
          child: const Text('Save and continue'),
        ),
        TextButton(onPressed: auth.logout, child: const Text('Sign out')),
      ],
    );
  }
}
