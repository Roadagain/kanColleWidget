/* global sleep:false */
import {RECOVERY} from "../../../Constants";

import {ScheduledQueues, Recovery} from "../../Models/Queue/Queue";
import Config                      from "../../Models/Config";
import Achievement                 from "../../Models/Achievement";

import WindowService       from "../../../Services/WindowService";
import CaptureService      from "../../../Services/CaptureService";
import TrimService         from "../../../Services/TrimService";
import Rectangle           from "../../../Services/Rectangle";
import KCWidgetAPI         from "../../../Services/API/KCW";
import Publisher           from "../../../Services/Publisher";
import Subscriber          from "../../Models/Subscriber";
import NotificationService from "../../../Services/NotificationService";
const notifications = new NotificationService();

import {checkQuestStatus} from "./common";

var __dock_id = null;

/**
 * 修復開始リクエスト完了トリガーには修復ドックの番号が含まれていない.
 * したがって修復開始リクエストの時点で修復ドックの番号をどこか（オンメモリでええやろ）に
 * 保存したうえで、修復開始リクエスト完了トリガー時にそれを使用する必要がある.
 */
export function onRecoveryStart(detail) {
  const {requestBody:{formData:{api_ndock_id:[dock_id],api_highspeed}}} = detail;
  __dock_id = parseInt(dock_id);
  if (api_highspeed == 1) __dock_id = null;

  Achievement.increment(RECOVERY);

}

/**
 * 上記の通り、このコントローラーが発火するときのdetailには修復ドックの番号が含まれていない.
 * したがって、上記のコントローラが保存したドック番号を参照している.
 */
export function onRecoveryStartCompleted(detail, dock = __dock_id) {

  if (__dock_id == null) return;
  if (!Config.isNotificationEnabled(RECOVERY)) return;

  const windows = WindowService.getInstance();
  const captures = new CaptureService();
  const api = new KCWidgetAPI(Config.find("api-server-url").value);
  sleep(0.85)
    .then(() => windows.find(true))
    .then(tab => captures.capture(tab.windowId))
    .then(uri => Image.init(uri))
    .then(img => TrimService.init(img).trim(Rectangle.init(img).ofRecovery(dock)))
    .then(uri => Promise.resolve(uri.replace(/data:image\/[png|jpeg|gif];base64,/, "")))
    .then(uri => api.ocr(uri))
    .then(({result}) => Promise.resolve(result.split(":").map(n => parseInt(n))))
    .then(([h, m, s]) => Promise.resolve({h, m, s}))
    .then(time => {
      const S = 1000; const M = 60 * S; const H = 60 * M;
      const length = time.h * H + (time.m - 1) * M + time.s * S;
      const recovery = new Recovery(Date.now() + length, dock, time);
      if (recovery.isValid()) ScheduledQueues.append(RECOVERY, recovery);
      if (Config.find("notification-display").onstart) notifications.create(recovery.toNotificationID(), recovery.toNotificationParamsForStart());
      Publisher.to(Subscriber.list()).publish(recovery);
    });
}

export function onRecoveryDocksDisplayed() {
  // TODO: Controllerからchromeを参照するのはやめましょう
  chrome.notifications.getAll(notes => {
    Object.keys(notes).filter(id => { return id.match(/^recovery/); }).map(id => {
      chrome.notifications.clear(id);
    });
  });
  checkQuestStatus(RECOVERY);
}

export function onRecoverySpeedup(detail) {
  const {requestBody:{formData:{api_ndock_id:[dock_id]}}} = detail;
  let recoveries = ScheduledQueues.find(RECOVERY) || ScheduledQueues.find("recoveries");
  recoveries.clear(dock_id);
}
