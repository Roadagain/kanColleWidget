/* global ChromeExOAuth:false */
// ChromeExOAuth は manifest.json 経由でbackgroundに読み込まれている.

// TODO: 開発用のtwitter-configをprocess.envかなんかで出し分けする
import {twitter} from "../../../../app-config.json";

// {{{ TODO: これはむしろchomexで定義したいなあ...
class HTTPCachely {
  constructor(namespace) {
    this.namespace = namespace;
  }
  get(key) {
    try {
      let entity = JSON.parse(localStorage.getItem(this.namespace) || "{}")[key];
      if (!entity) return;
      if (entity.expire < Date.now()) return;
      return entity.value;
    } catch (err) {
      return;
    }
  }
  set(key, value) {
    let store = JSON.parse(localStorage.getItem(this.namespace) || "{}");
    store[key] = {
      expire: Date.now() + (60 * 60 * 1000),
      value,
    };
    localStorage.setItem(this.namespace, JSON.stringify(store));
  }
  flush() {
    localStorage.removeItem(this.namespace);
  }
}
// }}}

class Twitter {

  static _instance = null;
  static sharedInstance() {
    if (!this._instance) {
      this._instance = this.init();
    }
    return this._instance;
  }
  static init(config = twitter) {
    var oauth = ChromeExOAuth.initBackgroundPage(config);
    oauth.callback_page = "dest/oauth/chrome_ex_oauth.html";
    return new this(oauth);
  }

  constructor(oauth /* ChromeExOAuth */) {
    this.oauth = oauth;
    this.cache = new HTTPCachely("cache_twitter");
  }

  auth(refresh = false) {
    if (refresh) this.clearTokens();
    return new Promise((resolve /*, reject */) => {
      // ChromeExOAuth.authorizeは、oauth.callback_pageで指定されたpathを開く
      this.oauth.authorize((/* token, secret */) => {
        // callback funcにはtokenとsecretが渡されるが、oauthが保存しているので、
        // ここでは扱う必要はないです
        resolve(/* {token, secret} */);
      });
    });
  }

  clearTokens() {
    this.oauth.clearTokens();
    this.cache.flush();
    return true;
  }

  getProfile() {
    const url = "https://api.twitter.com/1.1/account/verify_credentials.json";
    return this.request("GET", url);
  }

  getKanColleSTAFFTweets() {
    const url = "https://api.twitter.com/1.1/statuses/user_timeline.json";
    return this.request("GET", url, {parameters:{screen_name:"KanColle_STAFF"}}, false);
  }
  postWithImage(params) {
    const url = "https://api.twitter.com/1.1/statuses/update_with_media.json";
    const blob = this.uri2blob(params.image, params.type);
    let formData = new FormData();
    formData.append("media[]", blob);
    const tags = params.tags.map(tag => `#${tag.replace(/^#/, "")}`).join(" ");
    if (tags) params.status += "\n" + tags;
    const options = {
      parameters: {
        status: params.status,
        in_reply_to_status_id: /[0-9]+/.test(String(params.reply)) ? String(params.reply) : null,
      },
      body: formData,
    };
    return this.request("POST", url, options);
  }
  uri2blob (uri, type) {
    uri = uri.split("base64,")[1] || uri;
    let bin = atob(uri);
    const len = bin.length;
    let barr = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      barr[i] = bin.charCodeAt(i);
    }
    return new Blob([barr.buffer], { type: type });
  }

  request(method, url, options, usecache = true) {
    if (method == "GET" && usecache) {
      let cached = this.cache.get(url);
      if (cached !== undefined) return Promise.resolve(cached);
    }
    return new Promise((resolve, reject) => {
      if (!this.oauth.hasToken()) return reject({msg:"no token stored"});
      this.oauth.sendSignedRequest(
        url,
        (res) => {
          try {
            let data = JSON.parse(res);
            if (data.errors && data.errors.length) return reject(data.errors[0]);
            if (method == "GET") this.cache.set(url, data);
            resolve(data);
          } catch (err) {
            reject(err);
          }
        },
        {...options, method}
      );
    });
  }
}

export default Twitter;
