'use client';

import { Shield, AlertTriangle, XCircle, CheckCircle, Info } from 'lucide-react';

export default function CommunityGuidelinesPage() {
  const sections = [
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Komitmen Kami",
      desc: "Di.tulis berkomitmen untuk menciptakan platform sastra yang aman, kreatif, dan produktif bagi semua penulis dan pembaca."
    },
    {
      icon: <XCircle className="h-6 w-6 text-red-500" />,
      title: "Konten yang Dilarang",
      items: [
        {
          title: "SARA (Suku, Agama, Ras, Antargolongan)",
          points: [
            "Tidak boleh ada konten yang menghasut kebencian berdasarkan suku, agama, ras, atau golongan",
            "Dilarang menyebarkan stereotip negatif tentang kelompok masyarakat tertentu",
            "Tidak menggunakan bahasa penghinaan terhadap identitas keagamaan atau etnis"
          ]
        },
        {
          title: "Konten Seksual Eksplisit & Pedofilia",
          points: [
            "Dilarang menampilkan deskripsi seksual eksplisit yang tidak sesuai usia baca cerita",
            "Seluruh konten terkait anak di bawah umur harus aman dan edukatif",
            "Tidak boleh ada konten yang meromantisasi hubungan tidak sehat dengan未成年人"
          ]
        },
        {
          title: "Konten Menyimpang & Tidak Layak",
          points: [
            "Tidak mengandung kekerasan berlebihan, gore, atau sadisme",
            "Dilarang promosi tindakan kriminal, bunuh diri, atau merugikan diri sendiri/orang lain",
            "Tidak menyebarkan hoax, disinformasi, atau konten manipulatif"
          ]
        }
      ]
    },
    {
      icon: <CheckCircle className="h-6 w-6 text-green-500" />,
      title: "Kewajiban Penulis",
      items: [
        {
          title: "Tanggung Jawab Konten",
          points: [
            "Penulis bertanggung jawab penuh atas karya yang diunggah",
            "Karya harus orisinal atau memiliki izin dari pemilik hak cipta",
            "Hormati hak kekayaan intelektual orang lain"
          ]
        },
        {
          title: "Kualitas & Etika",
          points: [
            "Gunakan bahasa yang baik dan sesuai dengan target audiens",
            "Berikan rating dan warning jika ada konten sensitif",
            "Responsif terhadap feedback konstruktif dari pembaca"
          ]
        }
      ]
    },
    {
      icon: <AlertTriangle className="h-6 w-6 text-yellow-500" />,
      title: "Proses Moderasi",
      items: [
        {
          title: "Pemeriksaan Otomatis",
          points: [
            "AI scan untuk mendeteksi konten bermasalah sebelum publish",
            "Keyword filtering untuk mencegah pelanggaran obvious",
            "Risk score calculation setiap story"
          ]
        },
        {
          title: "Review Manual",
          points: [
            "Tim moderator meninjau konten flagged otomatis",
            "User bisa report konten yang bermasalah",
            "Review tim admin untuk kasus kompleks/SARA"
          ]
        },
        {
          title: "Konsekuensi Pelanggaran",
          points: [
            "⚠️ Warning untuk pelanggaran ringan pertama kali",
            "🚫 Temporary suspension untuk pelanggaran berulang",
            "🔒 Permanent ban untuk pelanggaran berat/persistent"
          ]
        }
      ]
    },
    {
      icon: <Info className="h-6 w-6 text-blue-500" />,
      title: "Hubungi Tim Kami",
      desc: "Jika Anda menemukan konten yang melanggar atau punya pertanyaan tentang pedoman ini, silakan hubungi:",
      contact: [
        "Email: safety@ditulis.tech",
        "WhatsApp: +62 XXX-XXXX-XXXX",
        "Laporan cepat via tombol 'Report' di setiap karya"
      ]
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <section className="text-center space-y-3 py-8 bg-gradient-to-br from-accent/10 to-accent/5 rounded-2xl border border-accent/20">
        <Shield className="h-12 w-12 mx-auto text-accent" />
        <h1 className="text-3xl font-bold font-serif">Pedoman Komunitas Di.tulis</h1>
        <p className="text-lg text-tx-soft max-w-2xl mx-auto">
          Platform sastra yang aman, kreatif, dan produktif untuk semua penulis dan pembaca Indonesia
        </p>
      </section>

      {/* Main Sections */}
      {sections.map((section, idx) => (
        <section key={idx} className="space-y-4">
          <div className="flex items-start gap-4 p-5 rounded-xl border border-border bg-bg-card hover:border-accent/30 transition-colors">
            <div className="shrink-0 mt-0.5">{section.icon}</div>
            <div className="flex-1">
              <h2 className="text-xl font-bold mb-2">{section.title}</h2>
              {section.desc && <p className="text-tx-soft mb-3">{section.desc}</p>}
              
              {section.items && section.items.length > 0 && (
                <div className="space-y-3 ml-2">
                  {section.items.map((item, i) => (
                    <div key={i} className="space-y-1.5">
                      <h3 className="font-semibold text-sm flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block" />
                        {item.title}
                      </h3>
                      <ul className="list-disc list-inside space-y-1 text-sm text-tx-soft ml-4">
                        {item.points.map((point, pi) => (
                          <li key={pi}>{point}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      ))}

      {/* Contact Info */}
      {sections[sections.length - 1]?.contact && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-5 space-y-2">
          <h3 className="font-bold text-blue-700 dark:text-blue-300">📞 Cara Melaporkan Pelanggaran</h3>
          {sections[sections.length - 1]!.contact!.map((line, idx) => (
            <p key={idx} className="text-sm text-blue-600 dark:text-blue-400">{line}</p>
          ))}
        </div>
      )}

      {/* CTA */}
      <section className="text-center pt-4">
        <button 
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-accent text-white font-medium hover:opacity-90 transition"
        >
          Kembali ke Atas ↑
        </button>
      </section>
    </div>
  );
}
