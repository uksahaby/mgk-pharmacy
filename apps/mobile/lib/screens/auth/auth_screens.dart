import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../../core/api.dart';
import '../../core/config.dart';
import '../../core/theme.dart';
import '../../router.dart';
import '../../state/auth_state.dart';
import '../../widgets/common.dart';
import '../../widgets/ui.dart';

/// Shared layout for sign-in, sign-up and password screens: logo on top, big title, then the form.
class _AuthScaffold extends StatelessWidget {
  const _AuthScaffold({required this.title, required this.subtitle, required this.children});
  final String title, subtitle;
  final List<Widget> children;
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(automaticallyImplyLeading: context.canPop(), toolbarHeight: context.canPop() ? 48 : 12),
    body: SafeArea(
      top: false,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(22, 4, 22, 28),
        children: [
          const Center(child: BrandLogo(size: 46)),
          const SizedBox(height: 30),
          Text(
            title,
            style: GoogleFonts.plusJakartaSans(fontSize: 26, fontWeight: FontWeight.w800, color: AppColors.ink, letterSpacing: -0.5),
          ),
          const SizedBox(height: 6),
          Text(subtitle, style: const TextStyle(color: AppColors.inkMuted, height: 1.45)),
          const SizedBox(height: 24),
          ...children,
        ],
      ),
    ),
  );
}

class _PasswordField extends StatefulWidget {
  const _PasswordField({required this.controller, required this.label, this.hintText = 'Enter your password', this.error, this.help, this.newPassword = false});
  final TextEditingController controller;
  final String label, hintText;
  final String? error, help;
  final bool newPassword;
  @override
  State<_PasswordField> createState() => _PasswordFieldState();
}

class _PasswordFieldState extends State<_PasswordField> {
  bool _show = false;
  @override
  Widget build(BuildContext context) => LabeledField(
    label: widget.label,
    child: TextField(
      controller: widget.controller,
      obscureText: !_show,
      autofillHints: [widget.newPassword ? AutofillHints.newPassword : AutofillHints.password],
      decoration: InputDecoration(
        hintText: widget.hintText,
        errorText: widget.error,
        helperText: widget.help,
        suffixIcon: IconButton(
          icon: Icon(_show ? Icons.visibility_off_outlined : Icons.visibility_outlined, color: AppColors.inkMuted),
          onPressed: () => setState(() => _show = !_show),
          tooltip: _show ? 'Hide password' : 'Show password',
        ),
      ),
    ),
  );
}

Widget _busyLabel(bool busy, String text) => busy ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : Text(text);

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

  // There is no self-service reset yet (no email provider), so point people to the pharmacy.
  void _forgot() => showModalBottomSheet<void>(
    context: context,
    showDragHandle: true,
    backgroundColor: Colors.white,
    builder: (c) => SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(22, 0, 22, 22),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Forgot your password?', style: GoogleFonts.plusJakartaSans(fontSize: 19, fontWeight: FontWeight.w800)),
            const SizedBox(height: 6),
            const Text("Message or call us and we'll reset it securely after checking it's you.", style: TextStyle(color: AppColors.inkMuted, height: 1.4)),
            const SizedBox(height: 18),
            MenuRow(icon: Icons.chat_outlined, title: 'WhatsApp', subtitle: 'Chat with the pharmacy', onTap: () => openLink(Site.whatsapp)),
            const SizedBox(height: 8),
            MenuRow(icon: Icons.call_outlined, title: 'Call us', subtitle: Site.phone, onTap: () => openLink(Site.phoneUri)),
          ],
        ),
      ),
    ),
  );

  @override
  Widget build(BuildContext context) => _AuthScaffold(
    title: 'Welcome back',
    subtitle: 'Sign in to your account to continue. Staff and riders sign in here too.',
    children: [
      AutofillGroup(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (_error != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 14),
                child: AlertBox(tone: AlertTone.error, message: _error),
              ),
            LabeledField(
              label: 'Email or phone number',
              child: TextField(
                controller: _email,
                keyboardType: TextInputType.emailAddress,
                autofillHints: const [AutofillHints.email, AutofillHints.telephoneNumber],
                textInputAction: TextInputAction.next,
                decoration: const InputDecoration(hintText: 'Enter your email or phone number'),
              ),
            ),
            const SizedBox(height: 16),
            _PasswordField(controller: _password, label: 'Password'),
          ],
        ),
      ),
      const SizedBox(height: 22),
      FilledButton(onPressed: _busy ? null : _submit, child: _busyLabel(_busy, 'Sign In')),
      const SizedBox(height: 6),
      Center(
        child: TextButton(
          onPressed: _forgot,
          child: const Text(
            'Forgot password?',
            style: TextStyle(color: AppColors.brand600, fontWeight: FontWeight.w600),
          ),
        ),
      ),
      const SizedBox(height: 6),
      const Row(
        children: [
          Expanded(child: Divider(color: AppColors.line)),
          Padding(
            padding: EdgeInsets.symmetric(horizontal: 12),
            child: Text('or', style: TextStyle(color: AppColors.inkMuted)),
          ),
          Expanded(child: Divider(color: AppColors.line)),
        ],
      ),
      const SizedBox(height: 16),
      OutlinedButton.icon(onPressed: () => context.go('/home'), icon: const Icon(Icons.storefront_outlined, size: 20), label: const Text('Continue without an account')),
      const SizedBox(height: 22),
      Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Text("Don't have an account?", style: TextStyle(color: AppColors.inkMuted)),
          TextButton(
            onPressed: () => context.pushReplacement('/register${widget.next != null ? '?next=${Uri.encodeComponent(widget.next!)}' : ''}'),
            child: const Text(
              'Create account',
              style: TextStyle(color: AppColors.brand600, fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
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
      if (_error != null)
        Padding(
          padding: const EdgeInsets.only(bottom: 14),
          child: AlertBox(tone: AlertTone.error, message: _error),
        ),
      Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: LabeledField(
              label: 'First name',
              child: TextField(
                controller: _first,
                textCapitalization: TextCapitalization.words,
                decoration: InputDecoration(hintText: 'First name', errorText: _fields['firstName']),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: LabeledField(
              label: 'Last name',
              child: TextField(
                controller: _last,
                textCapitalization: TextCapitalization.words,
                decoration: InputDecoration(hintText: 'Last name', errorText: _fields['lastName']),
              ),
            ),
          ),
        ],
      ),
      const SizedBox(height: 16),
      LabeledField(
        label: 'Email address',
        child: TextField(
          controller: _email,
          keyboardType: TextInputType.emailAddress,
          decoration: InputDecoration(hintText: 'you@example.com', errorText: _fields['email']),
        ),
      ),
      const SizedBox(height: 16),
      LabeledField(
        label: 'Mobile number',
        child: TextField(
          controller: _phone,
          keyboardType: TextInputType.phone,
          decoration: InputDecoration(hintText: '0803 123 4567', helperText: 'WhatsApp-enabled, for order updates. You can also sign in with it.', errorText: _fields['phone']),
        ),
      ),
      const SizedBox(height: 16),
      _PasswordField(controller: _password, label: 'Create a password', hintText: 'At least 8 characters', error: _fields['password'], help: 'Use a letter and a number.', newPassword: true),
      const SizedBox(height: 8),
      CheckboxListTile(
        contentPadding: EdgeInsets.zero,
        controlAffinity: ListTileControlAffinity.leading,
        value: _terms,
        onChanged: (v) => setState(() => _terms = v!),
        title: Wrap(
          children: [
            const Text('I agree to the '),
            InkWell(
              onTap: () => context.push('/info/terms'),
              child: const Text('terms', style: TextStyle(decoration: TextDecoration.underline)),
            ),
            const Text(' and '),
            InkWell(
              onTap: () => context.push('/info/privacy'),
              child: const Text('privacy policy', style: TextStyle(decoration: TextDecoration.underline)),
            ),
          ],
        ),
        subtitle: _fields['acceptTerms'] != null ? Text(_fields['acceptTerms']!, style: const TextStyle(color: AppColors.brand700)) : null,
      ),
      CheckboxListTile(
        contentPadding: EdgeInsets.zero,
        controlAffinity: ListTileControlAffinity.leading,
        value: _marketing,
        onChanged: (v) => setState(() => _marketing = v!),
        title: const Text('Send me occasional health tips and offers (optional). Prescription data is never used for marketing.', style: TextStyle(fontSize: 13)),
      ),
      const SizedBox(height: 12),
      FilledButton(onPressed: _busy ? null : _submit, child: _busyLabel(_busy, 'Create account')),
      const SizedBox(height: 10),
      Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Text('Already have an account?', style: TextStyle(color: AppColors.inkMuted)),
          TextButton(
            onPressed: () => context.pushReplacement('/login'),
            child: const Text(
              'Sign in',
              style: TextStyle(color: AppColors.brand600, fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
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
      title: 'Choose your password',
      subtitle: 'Welcome, ${auth.user?.firstName ?? ''}. You signed in with a temporary password from an administrator. Set your own private password to continue.',
      children: [
        if (_error != null)
          Padding(
            padding: const EdgeInsets.only(bottom: 14),
            child: AlertBox(tone: AlertTone.error, message: _error),
          ),
        _PasswordField(controller: _current, label: 'Temporary password', hintText: 'The one-time password you were given'),
        const SizedBox(height: 16),
        _PasswordField(controller: _next, label: 'New password', hintText: 'At least 8 characters', error: _fields['newPassword'], help: 'Use a letter and a number.', newPassword: true),
        const SizedBox(height: 16),
        _PasswordField(controller: _confirm, label: 'Confirm new password', hintText: 'Type it again', newPassword: true),
        const SizedBox(height: 22),
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
          child: _busyLabel(_busy, 'Save and continue'),
        ),
        TextButton(onPressed: auth.logout, child: const Text('Sign out')),
      ],
    );
  }
}
