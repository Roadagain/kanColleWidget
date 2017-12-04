
export default class Assets {
  constructor(config, module = chrome) {
    this.config = config;
    this.module = module;
  }
  errorIcon() {
    return "http://otiai10.github.io/kanColleWidget/src/img/icon.png";
  }
  downloadImageURL(url) {
    const filename = [this.getDownloadFolder(), this.getDownloadFilename(url)].filter(p => !!p).join("/");
    this.module.downloads.setShelfEnabled(false);
    const saveAs = false;
    return new Promise(resolve => this.module.downloads.download({url, filename, saveAs}, () => {
      resolve();
      setTimeout(() => this.module.downloads.setShelfEnabled(true), 1000);
    }));
  }
  getDownloadFolder() {
    return this.config.find("download-folder").value;
  }
  getDownloadFilename(url) {
    const [ , ext] = url.match(/data:image\/(jpeg|png);base64,/);
    const name = this.getDefaultDownloadFileName();
    return [name, ext].join(".");
  }
  getDefaultDownloadFileName(now = new Date()) {
    return now.format(this.config.find("download-file-name").value);
  }
  getDefaultDownloadFileExt() {
    return this.config.find("download-file-ext").value;
  }
  getNotificationIcon(name, useDefault = true) {
    if (this.config.find(`notification-for-${name}`).icon) {
      return this.config.find(`notification-for-${name}`).icon;
    }
    if (this.config.find("notification-for-default").icon) {
      return this.config.find("notification-for-default").icon;
    }
    if (!useDefault) return null;
    return this.module.extension.getURL("dest/img/icons/chang.white.png");
  }
  getDefaultIcon() {
    if (this.config.find("notification-for-default").icon) {
      return this.config.find("notification-for-default").icon;
    }
    return this.module.extension.getURL("dest/img/icons/chang.white.png");
  }
  getNotificationSound(name) {
    if (this.config.find(`notification-for-${name}`).sound) {
      return this.config.find(`notification-for-${name}`).sound;
    }
    if (this.config.find("notification-for-default").sound) {
      return this.config.find("notification-for-default").sound;
    }
    return null;
  }
  getSyncIcon(ev) {
    return `/dest/img/icons/cloud-${ev == "save" ? "up" : "down"}.png`;
  }
  playSoundIfSet(name) {
    let url = this.getNotificationSound(name);
    if (!url) return;
    let audio = document.createElement("audio");
    audio.src = url;
    let volume = this.config.find("notification-for-default").volume;
    audio.volume = volume / 100;
    audio.play();
  }
}
