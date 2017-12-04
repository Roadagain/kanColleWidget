import React, {Component} from "react";
import PropTypes from "prop-types";

import SelectField                from "material-ui/SelectField";
import MenuItem                   from "material-ui/MenuItem";
import ExitToApp                  from "material-ui/svg-icons/action/exit-to-app";
import IconButton                 from "material-ui/IconButton";
import ViewModule                 from "material-ui/svg-icons/action/view-module";
import Schedule                   from "material-ui/svg-icons/action/schedule";
import Build                      from "material-ui/svg-icons/action/build";
import ImportContacts             from "material-ui/svg-icons/communication/import-contacts";
import PhotoCamera                from "material-ui/svg-icons/image/photo-camera";
import ChromeReaderMode           from "material-ui/svg-icons/action/chrome-reader-mode";
import {grey400, grey800, red500} from "material-ui/styles/colors";

import {
  SeparatedIDsQueuesView,
  SeparatedTimelineQueuesView,
  MergedTimelineView
} from "./QueuesView";

import Tweet from "../Tweet.js";

// TODO: これ、名前かえような... window.Historyがあるからややこしい
import History           from "../../Models/History";
import Config            from "../../Models/Config";
import {ScheduledQueues} from "../../Models/Queue/Queue";

// TODO: messageのほうがいいかな...
import WindowService from "../../../Services/WindowService";
import Meta          from "../../../Services/Meta";

import {Client} from "chomex";
const client = new Client(chrome.runtime);

class ReactiveIconButton extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hovered: false
    };
  }
  render() {
    return (
      <div style={{position:"relative"}}>
        <IconButton
          ref="self"
          style={{position: "relative", transition: "all 1s", ...this.props.style || {}}}
          onClick={this.props.onClick}
          onMouseEnter={this.onMouseEnter.bind(this)}
          onMouseLeave={this.onMouseLeave.bind(this)}
        >
          {this.cloneIcon(this.props.children)}
        </IconButton>
        {this.getBadge()}
      </div>
    );
  }
  cloneIcon(icon) {
    return React.cloneElement(icon, {
      style: {transition: "all 1s"},
      color: this.state.hovered ? grey800 : grey400
    });
  }
  onMouseEnter() {
    this.setState({hovered: true});
  }
  onMouseLeave() {
    this.setState({hovered: false});
  }
  getBadge() {
    if (!this.props.badge) return null;
    const txt = (typeof this.props.badge == "string") ? this.props.badge : "";
    return (
      <div style={{position:"absolute",right:"6px",top:"6px",width:"12px",height:"12px",borderRadius:"6px",backgroundColor:red500}}>{txt}</div>
    );
  }
  static propTypes = {
    children: PropTypes.object,
    onClick:  PropTypes.func.isRequired,
    style:    PropTypes.object,
    badge:    PropTypes.any,
  }
}

export default class PopupView extends Component {

  constructor(props) {
    super(props);
    let last = History.find("last-selected-frame");
    this.state = {
      winconfigs: {},
      queues: ScheduledQueues.all(),
      last: last,
      captureIcon: null,
      selected: last.id,
      staffTweet: null,
    };
    this.meta = new Meta(History.find("update-checked"));
    client.message("/frame/all").then(res => {
      this.setState({winconfigs: res.data});
    });
    WindowService.getInstance().find(true).then(() => {
      this.setState({
        captureIcon: <ReactiveIconButton onClick={this.captureTab.bind(this)}><PhotoCamera /></ReactiveIconButton>
      });
    }).catch(() => console.log("CAPTURE ICON NOT RENDERED"));
  }

  componentDidMount() {
    const ENTER = 13;
    this.props.context.document.addEventListener("keydown", (ev) => {
      if (ev.which != ENTER) return;
      ev.preventDefault();
      client.message("/window/open", {frame: this.state.selected});
    });
    this.renderStaffTwitterView();
    this.renderBackgroundImage();
  }
  handleChange(ev, index, selected) {
    this.setState({selected});
    client.message("/window/open", {frame: selected});
  }
  onClickLaunchButton() {
    client.message("/window/open", {frame: this.state.selected});
  }
  openDashboard() {
    client.message("/window/dashboard");
  }
  openArchive() {
    this.props.context.open("/dest/html/archive.html");
  }
  openDeckCapture() {
    this.props.context.open("/dest/html/deckcapture.html");
  }
  openOptions() {
    this.props.context.open("/dest/html/options.html");
  }
  openWiki() {
    // TODO: windowオブジェクトを参照するのはいやだなー
    window.open("/dest/html/wiki.html");
  }
  captureTab() {
    client.message("/window/current-action");
  }
  getScheduleView() {
    switch (Config.find("schedule-display-mode").value) {
    case "merged-timeline":    return <MergedTimelineView queues={this.state.queues} />;
    case "separated-timeline": return <SeparatedTimelineQueuesView queues={this.state.queues} />;
    case "separated-ids": default: return <SeparatedIDsQueuesView queues={this.state.queues} />;
    }
  }
  renderStaffTwitterView() {
    if (!Config.find("staff-tweet").value) return;
    this.setState({staffTweet: <p style={{textAlign:"center", padding:"24px"}}>
      <img src="/dest/img/loader.gif" />
    </p>});
    client.message("/twitter/announce").then(({data}) => {
      const tweets = data.map(tweet => <Tweet tweet={tweet} key={tweet.id} />);
      this.setState({staffTweet: <div>{tweets}</div>});
      Tweet.activateAllLinks(window.document);
    });
  }
  renderBackgroundImage() {
    let html = document.querySelector("html");
    html.style.backgroundImage = `url('${Config.find("popup-background-image").url}')`;
  }
  render() {
    let sorted = Object.keys(this.state.winconfigs).filter(id => id != this.state.last.id);
    if (this.state.winconfigs[this.state.last.id]) sorted.unshift(this.state.last.id);
    const winconfigs = Object.keys(this.state.winconfigs).length ? sorted.map(id => {
      const win = this.state.winconfigs[id];
      return <MenuItem key={id} value={id} primaryText={win.alias} />;
    }) : [];
    return (
      <div>
        <div style={{display:"flex"}}>
          <SelectField value={this.state.selected} onChange={this.handleChange.bind(this)}>
            {winconfigs}
          </SelectField>
          <div style={{display:"flex",alignItems:"center",cursor:"pointer"}} onClick={this.onClickLaunchButton.bind(this)}>
            <ExitToApp style={{color:"#9E9E9E"}}/>
          </div>
        </div>
        {this.getScheduleView()}
        {this.state.staffTweet}
        <div style={{position:"fixed",bottom:"0",left:"0",right:"0",display:"flex",backgroundColor:"rgba(255,255,255,0.9)"}}>
          <ReactiveIconButton onClick={this.openOptions.bind(this)} badge={this.meta.hasUpdate()}><Build     /></ReactiveIconButton>
          <ReactiveIconButton onClick={this.openArchive.bind(this)}><ImportContacts /></ReactiveIconButton>
          <ReactiveIconButton onClick={this.openDeckCapture.bind(this)} style={{transform:"rotate(90deg)"}}><ViewModule/></ReactiveIconButton>
          <ReactiveIconButton onClick={this.openWiki.bind(this)}       ><ChromeReaderMode /></ReactiveIconButton>
          <ReactiveIconButton onClick={this.openDashboard.bind(this)}  ><Schedule  /></ReactiveIconButton>
          {this.state.captureIcon}
        </div>
      </div>
    );
  }
  static propTypes = {
    context: PropTypes.object.isRequired
  }
}
