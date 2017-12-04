import React, {Component} from "react";
import PropTypes from "prop-types";

import {Client} from "chomex";

import {ScheduledQueues} from "../../../../Models/Queue/Queue";
import ManualTimerDialog from "../Dialogs/ManualTimerDialog";
import {MergedTimelineView} from "../../../Popup/QueuesView";
import Config from "../../../../Models/Config";
import {MISSION,RECOVERY,CREATESHIP} from "../../../../../Constants";

class Schedule extends Component {
  constructor(props) {
    super(props);
    this.state = {hovered: false};
    this.rest = Config.find("time-format").value == "rest";
  }
  render() {
    const styles = {
      row: {display:"flex", alignItems:"center",cursor:"pointer",position:"relative"},
      col: {flex: "1"},
      tooltip: {
        position: "absolute",
        fontSize: "0.8em",
        color:    "white",
        padding:  "4px",
        width:    "120px",
        top:      "-42px", // FIXME: ここは行数を考慮すべき
        backgroundColor: "rgba(0,0,0,0.8)",
        display: this.state.hovered ? "block" : "none",
      },
      balloony: {
        position: "absolute",
        width: "0", height: "0",
        bottom:       "-6px",
        borderTop:    "solid 6px rgba(0,0,0,0.8)",
        borderLeft:   "solid 6px transparent",
        borderRight:  "solid 6px transparent",
        borderBottom: "none"
      }
    };
    const schedule = new Date(this.props.queue.scheduled);
    const name = `第${this.props.queue.deck || this.props.queue.dock}${this.props.unit}`;
    const time = this.props.queue.scheduled ? schedule.toClockString(this.rest) : "--:--";
    const tooltip = [<div key={0}>{this.props.queue.title}</div>,<div key={1}>{(this.rest ? "時刻" : "のこり") + " " + schedule.toClockString(!this.rest)}</div>];
    return (
      <div
            style={styles.row}
            onClick={() => this.props.manual(this.props.queue, this.props.queue.deck || this.props.queue.dock)}
            onMouseEnter={this.onMouseEnter.bind(this)}
            onMouseLeave={this.onMouseLeave.bind(this)}
            >
        <div style={styles.col}>{time}</div>
        <div style={styles.col}>{name}</div>
        <div style={styles.tooltip}>
          <div style={styles.balloony}></div>
          {tooltip}
        </div>
      </div>
    );
  }
  onMouseEnter() {
    if (!this.props.queue.scheduled) return;
    this.setState({hovered:true});
  }
  onMouseLeave() {
    this.setState({hovered:false});
  }
  static propTypes = {
    unit:  PropTypes.string.isRequired,
    queue: PropTypes.object.isRequired,
    manual:PropTypes.func.isRequired,
  }
}

export default class SchedulesRow extends Component {
  constructor(props) {
    super(props);
    this.state = {
      queues: ScheduledQueues.dict(),
      queue:  null,
    };
    this.openManualDialog = this.openManualDialog.bind(this);
    this.client = new Client(chrome.runtime);
  }
  componentDidMount() {
    this.setState({
      interval: setInterval(this.update.bind(this), 2000)
    });
  }
  componentWillUnmount() {
    clearInterval(this.state.interval);
  }
  update() {
    this.setState({queues: ScheduledQueues.dict()});
  }
  openManualDialog(queue, identifier) {
    queue.identifier = identifier;
    this.setState({queue});
  }
  commitManualDialg(time) {
    return this.client.message("/queues/manual", {queue: this.state.queue, time});
  }
  clearQueueManualDialog() {
    return this.client.message("/queues/clear",  {queue: this.state.queue});
  }
  getSeparatedBase(s = () => { return 0; }) {
    const col = {
      listStyleType: "none",
      padding:       "0 32px 0 0",
      flex:          "1",
    };
    return (
      <div style={{display: "flex", marginBottom: "12px"}}>
        <div style={col}>
          {this.state.queues.mission.sort(s).map((m,i) => {
            return <Schedule queue={m} key={i} unit={"艦隊"} manual={this.openManualDialog}/>;
          })}
        </div>
        <div style={col}>
          {this.state.queues.recovery.sort(s).map((r, i) => {
            return <Schedule queue={r} key={i} unit={"修復"} manual={this.openManualDialog}/>;
          })}
        </div>
        <div style={col}>
          {this.state.queues.createship.sort(s).map((c, i) => {
            return <Schedule queue={c} key={i} unit={"建造"} manual={this.openManualDialog}/>;
          })}
        </div>
      </div>
    );
  }
  getSeparatedIDs() {
    return this.getSeparatedBase();
  }
  getSeparatedTimeline() {
    return this.getSeparatedBase(
          (p, n) => {
            if (!p.scheduled && !n.scheduled) return ((p.deck || p.dock) < (n.deck || n.dock)) ? -1 : 1;
            return (p.scheduled < n.scheduled) ? -1 : 1;
          }
        );
  }
  getMergedTimeline() {
    const f = (q) => { return !!q.scheduled; };
    const queues = {
      [MISSION]:    {queues: this.state.queues[MISSION].filter(f)},
      [RECOVERY]:   {queues: this.state.queues[RECOVERY].filter(f)},
      [CREATESHIP]: {queues: this.state.queues[CREATESHIP].filter(f)},
    };
    return <MergedTimelineView queues={queues} />;
  }
  getTimers() {
    switch (Config.find("schedule-display-mode-dashboard").value) {
    case "merged-timeline":    return this.getMergedTimeline();
    case "separated-timeline": return this.getSeparatedTimeline();
    case "separated-ids": default: return this.getSeparatedIDs();
    }
  }
  render() {
    return (
      <div>
        {this.getTimers()}
        <ManualTimerDialog
              onCommit={this.commitManualDialg.bind(this)}
              onClear={this.clearQueueManualDialog.bind(this)}
              open={!!this.state.queue}
              queue={this.state.queue}
              close={() => this.setState({queue: null})}
              />
      </div>
    );
  }
}
