import { Component } from "react";
import FailureState from "./FailureState";

export default class AppErrorBoundary extends Component {
  state = { failed: false, attempt: 0 };

  static getDerivedStateFromError() { return { failed: true }; }

  retry = () => this.setState(({ attempt }) => ({ failed: false, attempt: attempt + 1 }));

  render() {
    if (this.state.failed) return <FailureState onRetry={this.retry} />;
    return <div key={this.state.attempt}>{this.props.children}</div>;
  }
}
