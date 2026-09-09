class LocalStorageManager {
  constructor() {
    this.storageKey = 'sih-fire-safety-v1';
  }

  read() {
    try {
      const value = localStorage.getItem(this.storageKey);
      return value ? JSON.parse(value) : {};
    } catch (error) {
      return {};
    }
  }

  write(data) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(data));
      return true;
    } catch (error) {
      return false;
    }
  }

  saveAssessment(record) {
    const current = this.read();
    current.assessment = record;
    return this.write(current);
  }

  saveCertificate(certificate) {
    const current = this.read();
    current.certificate = certificate;
    return this.write(current);
  }
}

window.LocalStorageManager = LocalStorageManager;
