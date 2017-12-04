/**
 * 遠征関係のAPIリクエストが飛んだ時に発火するコントローラ群
 */
import {MISSION} from "../../../Constants";

// Dependencies
import {Mission, ScheduledQueues} from "../../Models/Queue/Queue";
import Config                     from "../../Models/Config";
import Subscriber                 from "../../Models/Subscriber";
import Achievement                from "../../Models/Achievement";

import Publisher            from "../../../Services/Publisher";
import NotificationService  from "../../../Services/NotificationService";
const notifications = new NotificationService();

import {checkQuestStatus} from "./common";

/**
 * onMissionStart
 * 遠征に向かわせたときに発火するやつ
 */
export function onMissionStart(detail) {

  Achievement.increment(MISSION);

  if (!Config.isNotificationEnabled(MISSION)) return;

  const data = detail.requestBody.formData;
  const mission = Mission.createFromFormData(data);
  ScheduledQueues.append(MISSION, mission);
  // FIXME: ParamsをMissionモデルに考えさせるより、もっとControllerをファットにすべきなんじゃないか？

  if (Config.find("notification-display").onstart) notifications.create(mission.toNotificationID(), mission.toNotificationParamsForStart());
  notifications.clear(id => id == "strict-mission-warning");
  Publisher.to(Subscriber.list()).publish(mission);
}

export function onMissionResult(detail) {

  const {requestBody:{formData:{api_deck_id:[deck_id]}}} = detail;
  // FIXME: 表記ゆれの名残。"missions"のほうはいずれ消す。
  let missions = ScheduledQueues.find(MISSION) || ScheduledQueues.find("missions");
  missions.clear(deck_id);

  // TODO: Controllerレイヤーでchromeを参照するのはやめましょう
  chrome.notifications.getAll(notes => {
    Object.keys(notes).filter(id => { return id.match(/mission/); }).map(id => {
      chrome.notifications.clear(id);
    });
  });
}

export function onMissionPrepare() {
  checkQuestStatus(MISSION);
}
