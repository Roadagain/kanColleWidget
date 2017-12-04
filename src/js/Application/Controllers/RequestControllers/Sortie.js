import Config                       from "../../Models/Config";
import {ScheduledQueues, Tiredness} from "../../Models/Queue/Queue";
import Achievement                  from "../../Models/Achievement";

import {SORTIE}      from "../../../Constants";
import SortieContext from "../../../Services/SortieContext";

export function onSortieStart(detail) {

  Achievement.increment(SORTIE);

  const {requestBody:{formData:{api_maparea_id:[area],api_mapinfo_no:[info],api_deck_id:[deck]}}} = detail;
  SortieContext.sharedInstance().start(area, info, deck);

  if (!Config.isNotificationEnabled("tiredness")) return;

  const time = Date.now() + Config.find("notification-for-tiredness").time * (1000 * 60);
  const unit = Config.find("tiredness-unit").value == "deck" ? parseInt(deck) : Date.now();
  const tiredness = new Tiredness(time, unit);

    // TODO: Controllerからchromeを参照するのはやめましょう
  chrome.notifications.getAll(notes => {
    Object.keys(notes).filter(id => { return id.match(/^tiredness/); }).map(id => {
      chrome.notifications.clear(id);
    });
  });
  ScheduledQueues.append("tiredness", tiredness);
}
