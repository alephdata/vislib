import * as React from 'react'
import { connect, ConnectedProps } from 'react-redux';
import { DraggableCore, DraggableEvent, DraggableData } from 'react-draggable';

import { IEntityContext } from 'contexts';
import { GraphContext } from 'NetworkDiagram/GraphContext';
import { Point } from 'NetworkDiagram/layout/Point'
import { Vertex } from 'NetworkDiagram/layout/Vertex'
import { getRefMatrix, applyMatrix } from 'NetworkDiagram/renderer/utils';
import { VertexLabelRenderer } from './VertexLabelRenderer';
import { IconRenderer } from "./IconRenderer";
import { modes } from 'NetworkDiagram/utils'


interface IVertexRendererProps {
  vertex: Vertex
  entityContext: IEntityContext
  selectVertex: (vertex: Vertex, options?: any) => any
  dragSelection: (offset: Point) => any
  dropSelection: () => any
  actions: any
}

interface IVertexRendererState {
  hovered: boolean
}

export class VertexRendererBase extends React.PureComponent<IVertexRendererProps & PropsFromRedux, IVertexRendererState> {
  static contextType = GraphContext;
  gRef: React.RefObject<SVGGElement>

  constructor(props: Readonly<IVertexRendererProps & PropsFromRedux>) {
    super(props)

    this.state = { hovered: false }
    this.onDragStart = this.onDragStart.bind(this)
    this.onDragMove = this.onDragMove.bind(this)
    this.onDragEnd = this.onDragEnd.bind(this)
    this.onClick = this.onClick.bind(this)
    this.onDoubleClick = this.onDoubleClick.bind(this)
    this.onMouseOver = this.onMouseOver.bind(this)
    this.onMouseOut = this.onMouseOut.bind(this)
    this.gRef = React.createRef()
  }

  componentDidMount() {
    const { writeable } = this.context;
    const g = this.gRef.current;
    if (writeable && g !== null) {
      g.addEventListener('dblclick', this.onDoubleClick)
    }
  }

  componentWillUnmount() {
    const { writeable } = this.context;
    const g = this.gRef.current;
    if (writeable && g !== null) {
      g.removeEventListener('dblclick', this.onDoubleClick)
    }
  }

  private onDragMove(e: DraggableEvent, data: DraggableData) {
    const { interactionMode, layout } = this.context;
    const { actions, dragSelection } = this.props
    const matrix = getRefMatrix(this.gRef)
    const current = applyMatrix(matrix, data.x, data.y)
    const last = applyMatrix(matrix, data.lastX, data.lastY)
    const offset = layout.config.pixelToGrid(current.subtract(last))
    if (interactionMode !== modes.ITEM_DRAG) {
      actions.setInteractionMode(modes.ITEM_DRAG)
    }

    if (offset.x || offset.y) {
      dragSelection(offset)
    }
  }

  onDragEnd() {
    const { interactionMode } = this.context;
    const { actions, dropSelection } = this.props;

    if (interactionMode === modes.ITEM_DRAG) {
      actions.setInteractionMode(modes.SELECT)
    }
    dropSelection()
  }

  onDragStart(e: DraggableEvent) {
    this.onClick(e)
  }

  onClick(e: any) {
    const { interactionMode, layout } = this.context;
    const { vertex, selectVertex, actions } = this.props
    if (interactionMode === modes.EDGE_DRAW) {
      // can't draw link to self
      if (layout.isElementSelected(vertex)) {
        actions.setInteractionMode(modes.SELECT)
        return
      } else if (vertex.isEntity()) {
        selectVertex(vertex, { additional: true })
        actions.setInteractionMode(modes.EDGE_CREATE)
        return
      }
    }
    selectVertex(vertex, { additional: e.shiftKey })
  }

  onDoubleClick(e: MouseEvent) {
    const { actions, allowExpand, vertex } = this.props;
    e.preventDefault()
    e.stopPropagation()
    if (vertex.isEntity()) {
      if (allowExpand) {
        actions.showVertexMenu(vertex, new Point(e.clientX, e.clientY));
      } else {
        actions.setInteractionMode(modes.EDGE_DRAW);
      }
    }
  }

  onMouseOver() {
    const { interactionMode } = this.context;
    const { vertex } = this.props;

    if (interactionMode === modes.EDGE_DRAW && vertex.isEntity()) {
      this.setState({ hovered: true });
    }
  }

  onMouseOut() {
    this.setState({hovered: false})
  }

  getColor() {
    const { layout } = this.context;
    const { vertex } = this.props
    const { hovered } = this.state;

    const highlighted = layout.isElementSelected(vertex) || layout.selection.length === 0;

    if (highlighted || hovered) {
      return vertex.color || layout.config.DEFAULT_VERTEX_COLOR
    } else {
      return layout.config.UNSELECTED_COLOR
    }
  }

  allowPointerEvents() {
    const { interactionMode } = this.context;
    const { vertex } = this.props;

    // sets pointer events to none while dragging in order to detect mouseover on other elements
    if (interactionMode === modes.ITEM_DRAG) {
      return false;
    }
    // ensures non-entity vertices can't be selected when drawing edges
    if (interactionMode === modes.EDGE_DRAW && !vertex.isEntity()) {
      return false;
    }
    return true;
  }

  render() {
    const { layout, writeable } = this.context;
    const { entity, vertex } = this.props
    const { x, y } = layout.config.gridToPixel(vertex.position)
    const selected = layout.isElementSelected(vertex)
    const isEntity = vertex.isEntity()
    const defaultRadius = isEntity ? layout.config.DEFAULT_VERTEX_RADIUS : layout.config.DEFAULT_VERTEX_RADIUS/2;
    const vertexRadius = (vertex.radius || defaultRadius) * layout.config.gridUnit
    const translate = `translate(${x} ${y})`
    const labelPosition = new Point(0, vertexRadius + layout.config.gridUnit/2)

    const vertexColor = this.getColor()
    const groupStyles: React.CSSProperties = {
      cursor: selected && writeable ? 'grab' : 'pointer',
      pointerEvents: this.allowPointerEvents() ? 'auto' : 'none',
    }

    return (
      <DraggableCore
        handle='.handle'
        onStart={this.onDragStart}
        onDrag={writeable ? this.onDragMove : undefined}
        onStop={writeable ? this.onDragEnd : undefined}
        enableUserSelectHack={false} >
        <g className='vertex' transform={translate} ref={this.gRef} style={groupStyles}>
          <circle
            className="handle"
            r={vertexRadius}
            fill={isEntity ? vertexColor : 'white'}
            stroke={isEntity ? 'none' : vertexColor}
            onMouseOver={this.onMouseOver} onMouseOut={this.onMouseOut}
            />
          <VertexLabelRenderer center={labelPosition} label={vertex.label} type={vertex.type} onClick={this.onClick} color={vertexColor}/>
          {entity && <IconRenderer entity={entity} radius={vertexRadius}/>}
        </g>
      </DraggableCore>
    );
  }
}

const mapStateToProps = (state: any, ownProps: IVertexRendererProps) => {
  const { entityContext, vertex } = ownProps;
  const { entityId } = vertex;
  return ({
    allowExpand: !!entityId && !!entityContext.queryEntityExpand,
    entity: entityId && entityContext.selectEntity(state, entityId),
  });
}

const connector = connect(mapStateToProps);
type PropsFromRedux = ConnectedProps<typeof connector>

export const VertexRenderer = connector(VertexRendererBase);
