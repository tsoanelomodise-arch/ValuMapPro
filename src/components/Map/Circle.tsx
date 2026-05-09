import {
  forwardRef,
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef
} from 'react';

import {GoogleMapsContext} from '@vis.gl/react-google-maps';

import type {Ref} from 'react';

type CircleEventProps = {
  onClick?: (e: google.maps.MapMouseEvent) => void;
  onDrag?: (e: google.maps.MapMouseEvent) => void;
  onDragStart?: (e: google.maps.MapMouseEvent) => void;
  onDragEnd?: (e: google.maps.MapMouseEvent) => void;
  onMouseOver?: (e: google.maps.MapMouseEvent) => void;
  onMouseOut?: (e: google.maps.MapMouseEvent) => void;
  onRadiusChanged?: () => void;
  onCenterChanged?: () => void;
};

export type CircleProps = google.maps.CircleOptions & CircleEventProps;

export type CircleRef = Ref<google.maps.Circle | null>;

function useCircle(props: CircleProps) {
  const {
    onClick,
    onDrag,
    onDragStart,
    onDragEnd,
    onMouseOver,
    onMouseOut,
    onRadiusChanged,
    onCenterChanged,
    ...circleOptions
  } = props;
  
  const callbacks = useRef<Record<string, (e?: unknown) => void>>({});
  Object.assign(callbacks.current, {
    onClick,
    onDrag,
    onDragStart,
    onDragEnd,
    onMouseOver,
    onMouseOut,
    onRadiusChanged,
    onCenterChanged
  });

  const circle = useRef(new google.maps.Circle()).current;
  
  useMemo(() => {
    circle.setOptions(circleOptions);
  }, [circle, circleOptions]);

  const map = useContext(GoogleMapsContext)?.map;

  useEffect(() => {
    if (!map) return;
    circle.setMap(map);
    return () => {
      circle.setMap(null);
    };
  }, [map]);

  useEffect(() => {
    if (!circle) return;

    const gme = google.maps.event;
    [
      ['click', 'onClick'],
      ['drag', 'onDrag'],
      ['dragstart', 'onDragStart'],
      ['dragend', 'onDragEnd'],
      ['mouseover', 'onMouseOver'],
      ['mouseout', 'onMouseOut'],
      ['radius_changed', 'onRadiusChanged'],
      ['center_changed', 'onCenterChanged']
    ].forEach(([eventName, eventCallback]) => {
      gme.addListener(circle, eventName, (e: any) => {
        const callback = callbacks.current[eventCallback];
        if (callback) callback(e);
      });
    });

    return () => {
      gme.clearInstanceListeners(circle);
    };
  }, [circle]);

  return circle;
}

export const Circle = forwardRef((props: CircleProps, ref: CircleRef) => {
  const circle = useCircle(props);
  useImperativeHandle(ref, () => circle, []);
  return null;
});
