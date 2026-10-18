import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/api.dart';
import '../../core/config.dart';
import '../../core/format.dart';
import '../../core/theme.dart';
import '../../state/store_state.dart';
import '../../widgets/common.dart';

/// Help & policy pages. Same wording as the website so both channels say the same thing.
class InfoScreen extends StatelessWidget {
  const InfoScreen({super.key, required this.page});
  final String page;

  @override
  Widget build(BuildContext context) {
    final info = context.watch<StoreState>().info;
    final (title, intro, sections) = _content(page, info == null ? null : (zones: info.zones.map((z) => (z.name, z.etaLabel, naira(z.feeKobo))).toList(), free: naira(info.freeDeliveryThresholdKobo)));
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: ListView(padding: const EdgeInsets.fromLTRB(20, 12, 20, 32), children: [
        if (intro != null) Text(intro, style: const TextStyle(fontSize: 16, color: AppColors.inkSoft, height: 1.5)),
        for (final (heading, body) in sections) ...[
          const SizedBox(height: 20),
          if (heading.isNotEmpty) Text(heading, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
          const SizedBox(height: 6),
          for (final para in body)
            Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: para.startsWith('• ')
                  ? Row(crossAxisAlignment: CrossAxisAlignment.start, children: [const Text('•  '), Expanded(child: Text(para.substring(2), style: const TextStyle(height: 1.5, color: AppColors.inkSoft)))])
                  : Text(para, style: const TextStyle(height: 1.55, color: AppColors.inkSoft)),
            ),
        ],
        if (page == 'prescriptions') ...[
          const SizedBox(height: 16),
          FilledButton(onPressed: () => context.push('/account/prescriptions'), child: const Text('Upload a prescription now')),
        ],
        const SizedBox(height: 24),
        OutlinedButton.icon(onPressed: () => openLink(Site.whatsapp), icon: const Icon(Icons.chat_outlined), label: const Text('Still have questions? Chat with a pharmacist')),
      ]),
    );
  }
}

typedef _Delivery = ({List<(String, String, String)> zones, String free});

(String, String?, List<(String, List<String>)>) _content(String page, _Delivery? d) {
  switch (page) {
    case 'about':
      return (
        'About MGK Pharmacy',
        "We're a licensed community pharmacy in Kano. We built this online pharmacy so families across Nigeria can get genuine medicines and real pharmacist advice without the queue, guesswork or fakes.",
        [
          ('Genuine, traceable stock', ['We buy only from NAFDAC-registered manufacturers and licensed distributors, and track every batch and expiry date.']),
          ('Pharmacists, not just sellers', ['Every prescription is reviewed by a registered pharmacist, and you can ask us anything on WhatsApp.']),
          ('Fair, transparent prices', ['Clear prices, clear delivery fees, and free cancellation before dispatch.']),
          ('Visit us', ['${Site.addressLine1}, ${Site.addressLine2}, ${Site.city}.', for (final h in Site.hours) '• ${h.$1}: ${h.$2}']),
          ('Regulation', ['Registered with the Pharmacists Council of Nigeria (${Site.pcnNumber}). Superintendent pharmacist: ${Site.superintendent}. We follow the PCN code of ethics, NAFDAC regulations and the Nigeria Data Protection Act 2023.']),
        ]
      );
    case 'prescriptions':
      return (
        'How prescriptions work',
        'Some medicines can only be supplied against a valid prescription. Here is exactly what happens when you order one.',
        [
          ('1. Add your medicines to the cart', ['Prescription-only medicines are marked “Rx only”. You need to be signed in to check out.']),
          ('2. Attach your prescription', ['Upload a clear photo or PDF at checkout, or choose one you uploaded before. A valid prescription shows:', "• the patient's full name (and age for children)", '• the medicine name, strength, dose and duration', "• the prescriber's name, signature and hospital or clinic", '• the date it was written (generally within the last 6 months)']),
          ('3. A pharmacist reviews it', ["A registered pharmacist checks it, usually within 2 working hours. If anything is unclear we'll call you. We never substitute a different medicine without your prescriber's approval and your agreement."]),
          ('4. Pay and receive', ["You only pay once your prescription is approved, so you never pay for something we can't dispense."]),
          ('Repeat prescriptions', ['Approved prescriptions are saved to your account until they expire, so repeat orders for long-term conditions can be processed straight away.']),
          ('Controlled medicines', ['Some medicines (for example strong painkillers and some sedatives) are controlled by law. For these we also verify your identity once. It takes about two minutes.']),
        ]
      );
    case 'delivery':
      return (
        'Delivery & pickup',
        'Simple, transparent delivery prices. No hidden fees.',
        [
          ('Delivery prices', [for (final z in d?.zones ?? const <(String, String, String)>[]) '• ${z.$1}: ${z.$3} (${z.$2})', '• Pickup in store, Kano: Free (usually within 1 hour)', if (d != null) 'Free delivery anywhere in Nigeria on orders over ${d.free}.']),
          ('When will my order arrive?', ['Delivery times start once your order is paid (and, for prescription items, approved). Orders paid before 3pm in Kano usually arrive the same day.']),
          ('Live tracking', ['When your order is on its way you can watch the rider on a live map in the app or on the website, and you get a 4-digit delivery code to give the rider when your package arrives.']),
          ('Refrigerated medicines', ['Insulin and other cold-chain items are packed in insulated cool boxes with ice packs.']),
          ('Receiving your order', ['• Our rider will call the phone number on your order when they arrive.', '• Please check that the seal on your package is intact.', '• Controlled medicines must be received by the patient or an adult with ID.']),
        ]
      );
    case 'returns':
      return (
        'Returns & refunds',
        "For your safety, medicines can't be resold once they've left the pharmacy. But if we get something wrong, we'll put it right quickly.",
        [
          ('Cancelling an order', ["Cancel any order yourself from the order page, free of charge, any time before it's dispatched or ready for pickup. If you've paid, you get a full refund."]),
          ('Returns: within 48 hours of delivery', ['Contact us within 48 hours if:', '• you received the wrong item, strength or quantity', '• the packaging or seal was damaged on arrival', '• an item was expired or close to expiry', '• the product has been recalled by NAFDAC (no time limit)']),
          ("Items we can't take back", ['• prescription medicines that were dispensed correctly', '• refrigerated items, unless faulty on arrival', '• opened or partly used products, unless faulty']),
          ('How long refunds take', ['• Card or USSD (Paystack): 3–5 working days', '• Bank transfer: 1–2 working days', '• Pay at pickup: immediately in store, or 1–2 working days by transfer']),
        ]
      );
    case 'faq':
      return (
        'Frequently asked questions',
        null,
        [
          ('Do I need an account to order?', ['No, you can check out as a guest for everyday products. You need an account for prescription medicines.']),
          ('How do I know your medicines are genuine?', ['We buy only from NAFDAC-registered manufacturers and licensed distributors, and record the batch and expiry of everything we sell.']),
          ('Can I cancel my order?', ["Yes, from your order page, any time before it's dispatched. If you've paid, you get a full refund."]),
          ('How long does prescription review take?', ['Usually within 2 working hours during opening times. You only pay after approval.']),
          ('Will you substitute a different brand?', ["Never without asking. Substitutions need your agreement and, where required, your prescriber's approval."]),
          ('How can I pay?', ['By card, bank app or USSD through Paystack, by bank transfer, or in store when you pick up.']),
          ('I paid by bank transfer. What now?', ['Use your order number as the reference, then upload your receipt on your order page. We confirm within about an hour.']),
          ('Who can see my prescription?', ['Only our pharmacists and staff who need it to fulfil your order. We never use health information for marketing.']),
        ]
      );
    case 'privacy':
      return (
        'Privacy policy',
        'Your health information is sensitive. This explains what we collect, why, and your choices. It follows the Nigeria Data Protection Act 2023.',
        [
          ('What we collect', ['• Account and contact details', '• Prescriptions you upload and notes to our pharmacists', '• Identity documents, only if you verify to buy controlled medicines', '• Orders and payment references (we never store card details; Paystack handles cards)', '• Delivery location while an order is on its way (rider location is deleted after delivery)']),
          ('Why we use it', ['• To process, dispense and deliver your orders safely', '• To keep dispensing records required by PCN and NAFDAC', '• To send order updates', '• Health tips and offers only if you opt in']),
          ('Sharing', ['Delivery partners (name, phone, address), Paystack, your prescriber when verifying a prescription, and regulators only where the law requires. We never sell your data.']),
          ('How long we keep it', ['• Prescription records: 5 years', '• Financial records: 7 years', '• Inactive accounts: deleted after 3 years']),
          ('Your rights', ['Ask to access, correct, export or delete your data by emailing ${Site.email}. We respond within 30 days.']),
        ]
      );
    case 'terms':
    default:
      return (
        'Terms of service',
        'These terms apply when you use the MGK Pharmacy app or website or place an order with us.',
        [
          ('Your account', ['You must be 18 or over. Keep your password private. Information about prescriptions and identity must be true and accurate.']),
          ('Orders and prices', ['Prices are in Naira. Delivery fees are shown before you pay. An order is accepted when payment is confirmed (or, for pay-at-pickup, when we start preparing it).']),
          ('Prescription and controlled medicines', ["Supplied only after a pharmacist approves a valid prescription. Our pharmacists may decline to supply any medicine where it would be unsafe or unlawful; you won't be charged."]),
          ('Payment', ['Card and USSD payments are processed by Paystack. Unpaid bank-transfer orders are cancelled after 48 hours.']),
          ('Cancellation and returns', ['You may cancel before dispatch for a full refund. Returns follow our returns policy, which does not affect your rights under the Federal Competition and Consumer Protection Act 2018.']),
          ('Health information', ["Product information is general guidance and doesn't replace advice from a doctor or pharmacist. In an emergency, go to the nearest hospital."]),
          ('Governing law', ['These terms are governed by the laws of the Federal Republic of Nigeria.']),
        ]
      );
  }
}

class ContactScreen extends StatefulWidget {
  const ContactScreen({super.key});
  @override
  State<ContactScreen> createState() => _ContactScreenState();
}

class _ContactScreenState extends State<ContactScreen> {
  final _name = TextEditingController(), _email = TextEditingController(), _phone = TextEditingController(), _message = TextEditingController();
  String _topic = 'ORDER';
  bool _busy = false, _sent = false;
  Map<String, String> _fields = {};
  String? _error;

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Contact us')),
        body: ListView(padding: const EdgeInsets.all(16), children: [
          CardBox(onTap: () => openLink(Site.whatsapp), child: const ListTile(contentPadding: EdgeInsets.zero, leading: Icon(Icons.chat_outlined, color: AppColors.care600), title: Text('WhatsApp a pharmacist', style: TextStyle(fontWeight: FontWeight.w700)), subtitle: Text('Typical reply within 15 minutes'))),
          const SizedBox(height: 8),
          CardBox(onTap: () => openLink(Site.phoneUri), child: const ListTile(contentPadding: EdgeInsets.zero, leading: Icon(Icons.call_outlined, color: AppColors.brand600), title: Text(Site.phone, style: TextStyle(fontWeight: FontWeight.w700)), subtitle: Text('Call or SMS'))),
          const SizedBox(height: 8),
          CardBox(
            onTap: () => openLink('https://www.google.com/maps/search/?api=1&query=${Uri.encodeComponent('${Site.addressLine1}, ${Site.addressLine2}, ${Site.city}, Nigeria')}'),
            child: ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.place_outlined, color: AppColors.brand600),
              title: const Text('Visit the pharmacy', style: TextStyle(fontWeight: FontWeight.w700)),
              subtitle: Text('${Site.addressLine1}, ${Site.addressLine2}, ${Site.city}\n${Site.hours.map((h) => '${h.$1}: ${h.$2}').join('\n')}'),
              trailing: const Icon(Icons.directions_outlined),
            ),
          ),
          const SizedBox(height: 16),
          if (_sent)
            AlertBox(tone: AlertTone.success, title: 'Message sent', message: "Thanks, we'll reply to ${_email.text} within one working day.")
          else
            CardBox(
              child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                const Text('Send us a message', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 17)),
                const SizedBox(height: 12),
                if (_error != null) Padding(padding: const EdgeInsets.only(bottom: 10), child: AlertBox(tone: AlertTone.error, message: _error)),
                TextField(controller: _name, decoration: InputDecoration(labelText: 'Your name', errorText: _fields['name'])),
                const SizedBox(height: 10),
                TextField(controller: _email, keyboardType: TextInputType.emailAddress, decoration: InputDecoration(labelText: 'Email', errorText: _fields['email'])),
                const SizedBox(height: 10),
                TextField(controller: _phone, keyboardType: TextInputType.phone, decoration: const InputDecoration(labelText: 'Phone (optional)')),
                const SizedBox(height: 10),
                DropdownButtonFormField<String>(
                  initialValue: _topic,
                  decoration: const InputDecoration(labelText: 'Topic'),
                  items: const [
                    DropdownMenuItem(value: 'ORDER', child: Text('An existing order')),
                    DropdownMenuItem(value: 'PRESCRIPTION', child: Text('A prescription')),
                    DropdownMenuItem(value: 'PRODUCT', child: Text('Product availability or advice')),
                    DropdownMenuItem(value: 'FEEDBACK', child: Text('Feedback or a complaint')),
                    DropdownMenuItem(value: 'OTHER', child: Text('Something else')),
                  ],
                  onChanged: (v) => setState(() => _topic = v!),
                ),
                const SizedBox(height: 10),
                TextField(controller: _message, maxLines: 5, decoration: InputDecoration(labelText: 'Message', errorText: _fields['message'], hintText: 'Include your order number if it is about an order.')),
                const SizedBox(height: 6),
                const Text("Please don't send prescriptions here. Upload them securely from your account.", style: TextStyle(fontSize: 12, color: AppColors.inkMuted)),
                const SizedBox(height: 12),
                FilledButton.icon(
                  onPressed: _busy
                      ? null
                      : () async {
                          setState(() {
                            _busy = true;
                            _error = null;
                            _fields = {};
                          });
                          try {
                            await api.post('/contact', {'name': _name.text.trim(), 'email': _email.text.trim(), 'phone': _phone.text.trim(), 'topic': _topic, 'message': _message.text.trim()});
                            setState(() => _sent = true);
                          } on ApiException catch (e) {
                            setState(() {
                              _error = e.message;
                              _fields = e.fields;
                            });
                          } finally {
                            if (mounted) setState(() => _busy = false);
                          }
                        },
                  icon: const Icon(Icons.send_outlined),
                  label: const Text('Send message'),
                ),
              ]),
            ),
        ]),
      );
}
