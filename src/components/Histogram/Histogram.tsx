import * as React from 'react'
import { Colors } from "@blueprintjs/core";
import { injectIntl, WrappedComponentProps } from 'react-intl';
import {
  BarChart, Bar, Cell, XAxis, Tooltip, ReferenceArea, ResponsiveContainer,
} from 'recharts';
import c from 'classnames';
import Numeric from 'types/Numeric';

import './Histogram.scss';

const DEFAULT_FILL = Colors.BLUE2;
const ACTIVE_FILL = Colors.ORANGE3;

const dataFromEvent = (e: any) => (e?.activePayload?.[0]?.payload);

interface IHistogramDatum {
  id: string
  label: string
  [key: string]: any
}

interface IHistogramProps extends WrappedComponentProps {
  data: Array<IHistogramDatum>
  onSelect: (selected: any | Array<any> ) => void
  chartProps?: any
  containerProps?: any
  dataPropName: string
  activeId?: string
}

interface IHistogramState {
  selectStart?: IHistogramDatum
  selectEnd?: IHistogramDatum
}

export class Histogram extends React.Component<IHistogramProps, IHistogramState> {
  constructor(props: Readonly<IHistogramProps>) {
    super(props);

    this.state = {};
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onSelect = this.onSelect.bind(this);
  }

  onMouseDown(e: any) {
    this.setState({ selectStart: dataFromEvent(e) })
  }

  onMouseMove(e: any) {
    const { selectStart } = this.state;
    selectStart && this.setState({ selectEnd: dataFromEvent(e) })
  }

  onMouseUp(e: any) {
    this.onSelect(e);
  }

  onSelect(e: any) {
    const { selectStart, selectEnd } = this.state;
    if (selectStart && selectEnd) {
      this.props.onSelect([selectStart.id, selectEnd.id]);
    } else {
      this.props.onSelect(dataFromEvent(e)?.id);
    }

    this.setState({ selectStart: undefined, selectEnd: undefined });
  }

  renderBars() {
    const { activeId, data, dataPropName } = this.props;

    if (activeId) {
      return (
        <Bar dataKey={dataPropName}>
          {data.map(({ id }) => (
            <Cell fill={id === activeId ? ACTIVE_FILL : DEFAULT_FILL} key={`cell-${id}`} />
          ))}
        </Bar>
      );
    } else {
      return <Bar dataKey={dataPropName} fill={DEFAULT_FILL} />
    }
  }

  render() {
    const { chartProps, containerProps, data } = this.props;
    const { selectStart, selectEnd } = this.state;

    return (
      <div className={c('Histogram', { 'dragging': selectStart != null && selectEnd != null })}>
        <ResponsiveContainer width="100%" {...containerProps}>
          <BarChart
            data={data}
            barCategoryGap="10%"
            onMouseDown={this.onMouseDown}
            onMouseMove={this.onMouseMove}
            onMouseUp={this.onMouseUp}
            {...chartProps}
          >
            <XAxis dataKey="label" />
            <Tooltip
              offset={15}
              separator=": "
              formatter={(value: any) => <Numeric num={+value} />}
              itemStyle={{ color: DEFAULT_FILL }}
            />
            {this.renderBars()}
            {selectStart && selectEnd && (
              <ReferenceArea x1={selectStart.label} x2={selectEnd.label} />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }
}

export default injectIntl(Histogram);
