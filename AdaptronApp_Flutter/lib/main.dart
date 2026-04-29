import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:fl_chart/fl_chart.dart';
import 'package:google_fonts/google_fonts.dart';

void main() {
  runApp(const AdaptronApp());
}

class AdaptronApp extends StatelessWidget {
  const AdaptronApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'ADAPTRON V5',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF020816),
        textTheme: GoogleFonts.interTextTheme(ThemeData.dark().textTheme),
      ),
      home: const DashboardScreen(),
    );
  }
}

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  // Config
  String espIp = "192.168.1.100"; // IP par defaut
  Timer? dataTimer;

  // Data
  double voltage = 0.0;
  double frequency = 0.0;
  double power = 0.0;
  double upsPower = 0.0;
  double soc = 0.0;
  
  // Historique Graphique
  List<FlSpot> powerSpots = [];
  List<FlSpot> upsSpots = [];
  double timeX = 0;

  @override
  void initState() {
    super.initState();
    startPolling();
  }

  @override
  void dispose() {
    dataTimer?.cancel();
    super.dispose();
  }

  void startPolling() {
    dataTimer = Timer.periodic(const Duration(seconds: 2), (timer) async {
      await fetchApiData();
    });
  }

  Future<void> fetchApiData() async {
    try {
      final response = await http.get(Uri.parse('http://$espIp/api/data')).timeout(const Duration(seconds: 1));
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        setState(() {
          voltage = (data['voltage'] ?? 0).toDouble();
          frequency = (data['freq'] ?? 0).toDouble();
          power = (data['power'] ?? 0).toDouble();
          upsPower = (data['upsPower'] ?? 0).toDouble();
          soc = (data['soc'] ?? 0).toDouble();

          timeX += 1;
          powerSpots.add(FlSpot(timeX, power));
          upsSpots.add(FlSpot(timeX, upsPower));

          if (powerSpots.length > 30) {
            powerSpots.removeAt(0);
            upsSpots.removeAt(0);
          }
        });
      }
    } catch (e) {
      // Ignorer silencieusement pour le dev/demo, ou simuler :
      // print("Erreur de connexion ESP32");
    }
  }

  Future<void> sendCommand(String endpoint) async {
    try {
      final response = await http.post(Uri.parse('http://$espIp$endpoint')).timeout(const Duration(seconds: 2));
      if (response.statusCode == 200) {
        if(!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Commande exécutée avec succès ✅'), backgroundColor: Color(0xFF30D158)),
        );
      }
    } catch (e) {
      if(!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Erreur : Impossible de joindre l\'ESP32 ❌'), backgroundColor: Color(0xFFFF453A)),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: Row(
          children: [
            const Icon(Icons.flash_on, color: Color(0xFF00A3FF)),
            const SizedBox(width: 8),
            Text('ADAPTRON V5', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 22, letterSpacing: 1)),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings),
            onPressed: () {
              showSettingsDialog(context);
            },
          )
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _buildNetworkPanel(),
            const SizedBox(height: 16),
            _buildBatteryPanel(),
            const SizedBox(height: 16),
            _buildChartPanel(),
            const SizedBox(height: 16),
            _buildControlPanel(),
          ],
        ),
      ),
    );
  }

  Widget _buildNetworkPanel() {
    return GlassPanel(
      borderColor: const Color(0x2200A3FF),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text('Réseau SNEL (Entrée)', style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.w600)),
              const Spacer(),
              const Icon(Icons.electrical_services, color: Color(0xFF8AA4C8)),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _buildStat("Tension", "\${voltage.toStringAsFixed(1)} V", Colors.white),
              _buildStat("Fréq.", "\${frequency.toStringAsFixed(1)} Hz", Colors.white),
              _buildStat("Puissance", "\${power.toStringAsFixed(0)} W", const Color(0xFF00A3FF)),
            ],
          )
        ],
      ),
    );
  }

  Widget _buildBatteryPanel() {
    return GlassPanel(
      borderColor: const Color(0x33FF7F00),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text('Power Station', style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.w600)),
              const Spacer(),
              const Icon(Icons.battery_charging_full, color: Color(0xFFFF7F00)),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                flex: 1,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Charge (SOC)', style: TextStyle(color: const Color(0xFF8AA4C8), fontSize: 12, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 4),
                    Text('\${soc.toStringAsFixed(1)}%', style: GoogleFonts.outfit(fontSize: 32, fontWeight: FontWeight.bold, color: const Color(0xFFFF7F00))),
                  ],
                ),
              ),
              Expanded(
                flex: 1,
                child: _buildStat("Secourue", "\${upsPower.toStringAsFixed(0)} W", const Color(0xFFFF7F00)),
              )
            ],
          ),
          const SizedBox(height: 12),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: soc / 100,
              backgroundColor: const Color(0xFF1E283F),
              valueColor: AlwaysStoppedAnimation<Color>(soc < 20 ? const Color(0xFFFF453A) : const Color(0xFFFF7F00)),
              minHeight: 12,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildChartPanel() {
    return GlassPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Flux Actuel', style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.w600)),
          const SizedBox(height: 16),
          SizedBox(
            height: 200,
            child: LineChart(
              LineChartData(
                gridData: FlGridData(show: true, drawVerticalLine: false, getDrawingHorizontalLine: (val) => FlLine(color: Colors.white10, strokeWidth: 1)),
                titlesData: FlTitlesData(
                  leftTitles: AxisTitles(sideTitles: SideTitles(showTitles: true, reservedSize: 40, getTitlesWidget: (val, meta) => Text('\${val.toInt()}', style: const TextStyle(color: Colors.white38, fontSize: 10)))),
                  bottomTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  rightTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  topTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                ),
                borderData: FlBorderData(show: false),
                lineBarsData: [
                  LineChartBarData(
                    spots: powerSpots.isEmpty ? const [FlSpot(0, 0)] : powerSpots,
                    isCurved: true,
                    color: const Color(0xFF00A3FF),
                    barWidth: 3,
                    isStrokeCapRound: true,
                    dotData: FlDotData(show: false),
                    belowBarData: BarAreaData(show: true, color: const Color(0x2200A3FF)),
                  ),
                  LineChartBarData(
                    spots: upsSpots.isEmpty ? const [FlSpot(0, 0)] : upsSpots,
                    isCurved: true,
                    color: const Color(0xFFFF7F00),
                    barWidth: 2,
                    isStrokeCapRound: true,
                    dotData: FlDotData(show: false),
                  ),
                ],
              ),
            ),
          )
        ],
      ),
    );
  }

  Widget _buildControlPanel() {
    return GlassPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Commandes Hardwares', style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.w600)),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: ActionButton(
                  icon: Icons.power,
                  label: "Forcer SNEL",
                  color: const Color(0xFF003366),
                  textColor: Colors.white,
                  onTap: () => sendCommand('/api/cmd?action=force_snel'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ActionButton(
                  icon: Icons.battery_charging_full,
                  label: "Forcer BATTERIE",
                  color: const Color(0xFFCC6600),
                  textColor: Colors.white,
                  onTap: () => sendCommand('/api/cmd?action=force_ups'),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ActionButton(
            icon: Icons.shield,
            label: "Actionner Relais SSR (Isolement)",
            color: const Color(0xFF0077B3),
            textColor: Colors.white,
            onTap: () => sendCommand('/api/toggle-ssr'),
            fullWidth: true,
          ),
        ],
      ),
    );
  }

  Widget _buildStat(String label, String value, Color color) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label.toUpperCase(), style: TextStyle(color: const Color(0xFF8AA4C8), fontSize: 10, fontWeight: FontWeight.w700, letterSpacing: 0.5)),
        const SizedBox(height: 4),
        Text(value, style: GoogleFonts.outfit(fontSize: 22, fontWeight: FontWeight.bold, color: color)),
      ],
    );
  }

  void showSettingsDialog(BuildContext context) {
    final ipController = TextEditingController(text: espIp);
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF0A142A),
        title: Text('Configuration IP', style: GoogleFonts.outfit(color: Colors.white)),
        content: TextField(
          controller: ipController,
          style: const TextStyle(color: Colors.white),
          decoration: const InputDecoration(
            labelText: 'IP de l\'ESP32',
            labelStyle: TextStyle(color: Color(0xFF8AA4C8)),
            enabledBorder: UnderlineInputBorder(borderSide: BorderSide(color: Color(0xFF00A3FF))),
          ),
        ),
        actions: [
          TextButton(
            child: const Text('Annuler', style: TextStyle(color: Colors.white54)),
            onPressed: () => Navigator.pop(ctx),
          ),
          TextButton(
            child: const Text('Sauvegarder', style: TextStyle(color: Color(0xFF00A3FF))),
            onPressed: () {
              setState(() => espIp = ipController.text.trim());
              Navigator.pop(ctx);
            },
          ),
        ],
      ),
    );
  }
}

class GlassPanel extends StatelessWidget {
  final Widget child;
  final Color borderColor;

  const GlassPanel({super.key, required this.child, this.borderColor = const Color(0x2200A3FF)});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFF0A142A).withOpacity(0.8),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: borderColor, width: 1.5),
        boxShadow: const [
          BoxShadow(color: Colors.black26, blurRadius: 15, offset: Offset(0, 8)),
        ],
      ),
      child: child,
    );
  }
}

class ActionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final Color textColor;
  final VoidCallback onTap;
  final bool fullWidth;

  const ActionButton({super.key, required this.icon, required this.label, required this.color, required this.textColor, required this.onTap, this.fullWidth = false});

  @override
  Widget build(BuildContext context) {
    final btn = GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 12),
        decoration: BoxDecoration(
          color: color,
          borderRadius: BorderRadius.circular(12),
          boxShadow: [
            BoxShadow(color: color.withOpacity(0.4), blurRadius: 10, offset: const Offset(0, 4))
          ]
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: textColor, size: 20),
            const SizedBox(width: 8),
            Text(label, style: GoogleFonts.outfit(color: textColor, fontWeight: FontWeight.bold, fontSize: 14)),
          ],
        ),
      ),
    );
    
    return fullWidth ? btn : btn;
  }
}
