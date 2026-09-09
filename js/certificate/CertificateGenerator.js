class CertificateGenerator {
  constructor() {
    this.canvas = null;
    this.ctx = null;
  }

  createCertificate({ traineeName, score, criticalErrors, status, certificateId, dateString }) {
    const canvas = document.createElement('canvas');
    canvas.width = 900;
    canvas.height = 560;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#f6f7fb';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#0d1117';
    ctx.font = 'bold 32px Arial';
    ctx.fillText('Certificate of Completion', 240, 80);

    ctx.font = '20px Arial';
    ctx.fillText('Module 1: Fire & Explosion Response', 290, 120);

    ctx.strokeStyle = '#d0d7de';
    ctx.lineWidth = 2;
    ctx.strokeRect(80, 160, canvas.width - 160, 280);

    ctx.font = 'bold 22px Arial';
    ctx.fillText('Trainee Name:', 120, 220);
    ctx.font = '20px Arial';
    ctx.fillText(traineeName || 'Trainee', 350, 220);

    ctx.font = 'bold 22px Arial';
    ctx.fillText('Score:', 120, 270);
    ctx.font = '20px Arial';
    ctx.fillText(`${score}%`, 350, 270);

    ctx.fillText('Status:', 120, 320);
    ctx.fillText(status, 350, 320);

    ctx.fillText('Critical Errors:', 120, 370);
    ctx.fillText(String(criticalErrors), 350, 370);

    ctx.fillText('Issue Date:', 120, 420);
    ctx.fillText(dateString, 350, 420);

    ctx.font = '16px Arial';
    ctx.fillText('Certificate ID:', 520, 220);
    ctx.fillText(certificateId, 520, 245);

    const qrX = 610;
    const qrY = 265;
    ctx.strokeStyle = '#111827';
    for (let y = 0; y < 21; y += 1) {
      for (let x = 0; x < 21; x += 1) {
        if (((x * 17 + y * 19) % 7) < 3 || ((y * 11 + x * 13) % 5) === 0) {
          ctx.fillRect(qrX + x * 6, qrY + y * 6, 5, 5);
        }
      }
    }

    ctx.fillStyle = '#1f2937';
    ctx.font = '16px Arial';
    ctx.fillText('Offline certificate generated locally', 520, 430);

    return canvas;
  }
}

window.CertificateGenerator = CertificateGenerator;
