import { Ref, computed } from 'vue'
import { MutationTypes, useStore } from '@/store'
import { PPTElement, PPTLineElement } from '@/types/slides'
import { OperateLineHandler, OperateLineHandlers } from '@/types/edit'
import useHistorySnapshot from '@/hooks/useHistorySnapshot'

interface AdsorptionPoint {
  x: number;
  y: number;
}

export default (elementList: Ref<PPTElement[]>) => {
  const store = useStore()
  const canvasScale = computed(() => store.state.canvasScale)

  const { addHistorySnapshot } = useHistorySnapshot()

  // 拖拽线条端点
  const dragLineElement = (e: MouseEvent, element: PPTLineElement, command: OperateLineHandler) => {
    let isMouseDown = true

    const sorptionRange = 8

    const startPageX = e.pageX
    const startPageY = e.pageY

    const adsorptionPoints: AdsorptionPoint[] = []

    // 获取所有线条以外的未旋转的元素的8个缩放点作为吸附位置
    for (let i = 0; i < elementList.value.length; i++) {
      const _element = elementList.value[i]
      if (_element.type === 'line' || ('rotate' in _element && _element.rotate)) continue

      const left = _element.left
      const top = _element.top
      const width = _element.width
      const height = _element.height
      
      const right = left + width
      const bottom = top + height
      const centerX = top + height / 2
      const centerY = left + width / 2

      const topPoint = { x: centerY, y: top }
      const bottomPoint = { x: centerY, y: bottom }
      const leftPoint = { x: left, y: centerX }
      const rightPoint = { x: right, y: centerX }

      const leftTopPoint = { x: left, y: top }
      const rightTopPoint = { x: right, y: top }
      const leftBottomPoint = { x: left, y: bottom }
      const rightBottomPoint = { x: right, y: bottom }

      adsorptionPoints.push(
        topPoint,
        bottomPoint,
        leftPoint,
        rightPoint,
        leftTopPoint,
        rightTopPoint,
        leftBottomPoint,
        rightBottomPoint,
      )
    }

    document.onmousemove = e => {
      if (!isMouseDown) return

      const currentPageX = e.pageX
      const currentPageY = e.pageY

      const moveX = (currentPageX - startPageX) / canvasScale.value
      const moveY = (currentPageY - startPageY) / canvasScale.value
      
      // 线条起点和终点在编辑区域中的位置
      let startX = element.left + element.start[0]
      let startY = element.top + element.start[1]
      let endX = element.left + element.end[0]
      let endY = element.top + element.end[1]

      // 拖拽起点或终点的位置
      // 水平和垂直方向上有吸附
      if (command === OperateLineHandlers.START) {
        startX = startX + moveX
        startY = startY + moveY

        if (Math.abs(startX - endX) < sorptionRange) startX = endX
        if (Math.abs(startY - endY) < sorptionRange) startY = endY

        for (const adsorptionPoint of adsorptionPoints) {
          const { x, y } = adsorptionPoint
          if (Math.abs(x - startX) < sorptionRange && Math.abs(y - startY) < sorptionRange) {
            startX = x
            startY = y
            break
          }
        }
      }
      else {
        endX = endX + moveX
        endY = endY + moveY

        if (Math.abs(startX - endX) < sorptionRange) endX = startX
        if (Math.abs(startY - endY) < sorptionRange) endY = startY

        for (const adsorptionPoint of adsorptionPoints) {
          const { x, y } = adsorptionPoint
          if (Math.abs(x - endX) < sorptionRange && Math.abs(y - endY) < sorptionRange) {
            endX = x
            endY = y
            break
          }
        }
      }

      // 计算更新起点和终点基于自身元素位置的坐标
      const minX = Math.min(startX, endX)
      const minY = Math.min(startY, endY)
      const maxX = Math.max(startX, endX)
      const maxY = Math.max(startY, endY)

      const start: [number, number] = [0, 0]
      const end: [number, number] = [maxX - minX, maxY - minY]
      if (startX > endX) {
        start[0] = maxX - minX
        end[0] = 0
      }
      if (startY > endY) {
        start[1] = maxY - minY
        end[1] = 0
      }

      elementList.value = elementList.value.map(el => {
        if (el.id === element.id) {
          return {
            ...el,
            left: minX,
            top: minY,
            start: start,
            end: end,
          }
        }
        return el
      })
    }

    document.onmouseup = e => {
      isMouseDown = false
      document.onmousemove = null
      document.onmouseup = null

      const currentPageX = e.pageX
      const currentPageY = e.pageY

      if (startPageX === currentPageX && startPageY === currentPageY) return

      store.commit(MutationTypes.UPDATE_SLIDE, { elements: elementList.value })
      addHistorySnapshot()
    }
  }

  return {
    dragLineElement,
  }
}