import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, BACKGROUND_BASE, BACKGROUND_RADIAL } from '../constants/theme';
import GlassCard from './GlassCard';

const ActiveOrdersList = ({ orders }) => {
  // Generate two random radial gradient positions (matching the main background)
  const radialGradients = useMemo(() => [
    {
      id: 'orders-bg-radial-1',
      cx: `${Math.floor(Math.random() * 80) + 10}%`,
      cy: `${Math.floor(Math.random() * 80) + 10}%`,
      rx: '60%',
      ry: '60%',
    },
    {
      id: 'orders-bg-radial-2',
      cx: `${Math.floor(Math.random() * 80) + 10}%`,
      cy: `${Math.floor(Math.random() * 80) + 10}%`,
      rx: '70%',
      ry: '70%',
    },
  ], []);

  if (!orders || orders.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No active orders.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, styles.purpleList]}>
      {orders.map((order, index) => (
        <View
          key={order.id}
          style={[
            styles.orderRow,
            index < orders.length - 1 && styles.orderRowBorder,
          ]}
        >
          <View style={styles.orderHeader}>
            <Text style={styles.orderNumber}>Order #{order.id}</Text>
            <Text style={[
              styles.orderStatus,
              {
                color:
                  order.status === 'in_progress'
                    ? COLORS.primary
                    : order.status === 'complete'
                    ? COLORS.secondary
                    : COLORS.text.muted,
              },
            ]}>
              {order.status.replace('_', ' ')}
            </Text>
          </View>
          <View style={styles.orderItems}>
            {order.transaction_items && order.transaction_items.length > 0 &&
              order.transaction_items.slice(0, 2).map((item, idx) => (
                <Text key={idx} style={styles.orderItemText}>
                  {item.quantity}x {item.menu_items?.name || 'Unknown Item'}
                </Text>
              ))}
            {order.transaction_items && order.transaction_items.length > 2 && (
              <Text style={styles.orderItemText}>
                +{order.transaction_items.length - 2} more items
              </Text>
            )}
          </View>
          {order.tip_amount > 0 && (
            <Text style={styles.orderTip}>
              Tip: ${((order.tip_amount || 0) / 100).toFixed(2)}
            </Text>
          )}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  content: {
    padding: 16,
    position: 'relative',
    zIndex: 1,
  },
  orderRow: {
    paddingVertical: 8,
    paddingHorizontal: 0,
    marginBottom: 2,
  },
  orderRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  orderNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFF',
  },
  orderStatus: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  orderItems: {
    marginBottom: 4,
  },
  orderItemText: {
    fontSize: 12,
    color: '#FFF',
    marginBottom: 2,
  },
  orderTip: {
    fontSize: 10,
    color: '#FFF',
    fontWeight: 'bold',
  },
  emptyContainer: {
    minHeight: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#FFF',
    opacity: 0.7,
    fontSize: 16,
  },
  purpleList: {
    backgroundColor: BACKGROUND_RADIAL,
    borderRadius: 12,
    padding: 8,
  },
});

export default ActiveOrdersList; 