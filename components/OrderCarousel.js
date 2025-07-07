import React from 'react';
import { View, StyleSheet } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import ActiveOrdersList from './ActiveOrdersList';

const ORDER_ITEM_HEIGHT = 80;
const VISIBLE_ORDERS = 3;
const SCROLL_AREA_HEIGHT = ORDER_ITEM_HEIGHT * VISIBLE_ORDERS;

const OrderCarousel = ({ orders, onOrderPress }) => {
  if (!orders || orders.length === 0) {
    return <ActiveOrdersList orders={orders} />;
  }

  // If 3 or fewer orders, show all with no fade
  if (orders.length <= VISIBLE_ORDERS) {
    return <ActiveOrdersList orders={orders} />;
  }

  // More than 3 orders: show with bottom fade only
  return (
    <View style={{ width: '100%', height: SCROLL_AREA_HEIGHT, position: 'relative' }}>
      <MaskedView
        style={{ height: SCROLL_AREA_HEIGHT, width: '100%' }}
        maskElement={
          <Svg height="100%" width="100%">
            <Defs>
              <LinearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor="#000" stopOpacity="1" />
                <Stop offset="85%" stopColor="#000" stopOpacity="1" />
                <Stop offset="100%" stopColor="#000" stopOpacity="0" />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#fade)" />
          </Svg>
        }
      >
        <ActiveOrdersList orders={orders} />
      </MaskedView>
    </View>
  );
};

export default OrderCarousel; 