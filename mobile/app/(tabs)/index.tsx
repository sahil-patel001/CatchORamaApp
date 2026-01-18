import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useProducts } from '../../context/ProductsContext';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { deleteProduct, getProducts } from '../../services/products';
import { Product } from '../../types';

const ITEMS_PER_PAGE = 20;

export default function ProductListScreen() {
  const { user, logout } = useAuth();
  const { productsChangeCounter, markProductsChanged } = useProducts();
  const { checkConnection } = useNetworkStatus();
  const router = useRouter();
  const listRef = useRef<FlatList<Product> | null>(null);
  const vendorHasFetchedOnceRef = useRef(false);
  const vendorLastSeenChangeCounterRef = useRef(0);
  const isLoadingMoreRef = useRef(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [deletingById, setDeletingById] = useState<Record<string, boolean>>({});

  const fetchProducts = useCallback(async (pageNum: number, refresh = false) => {
    const isConnected = await checkConnection();
    if (!isConnected) {
      setIsLoading(false);
      setIsRefreshing(false);
      setIsLoadingMore(false);
      isLoadingMoreRef.current = false;
      return;
    }

    try {
      const response = await getProducts({ page: pageNum, limit: ITEMS_PER_PAGE });
      
      if (response.success) {
        const newProducts = response.data.products;
        const pagination = response.data.pagination as
          | { page?: number; limit?: number; total?: number; pages?: number }
          | undefined;
        const effectivePage = pagination?.page ?? pageNum;
        const effectiveLimit = pagination?.limit ?? ITEMS_PER_PAGE;
        const totalPages =
          pagination?.pages ??
          (typeof pagination?.total === 'number' && effectiveLimit > 0
            ? Math.ceil(pagination.total / effectiveLimit)
            : undefined);
        
        if (refresh || pageNum === 1) {
          setProducts(newProducts);
        } else {
          // Dedupe by _id to protect against repeated `onEndReached` calls.
          setProducts((prev) => {
            const merged = [...prev, ...newProducts];
            const seen = new Set<string>();
            const deduped: Product[] = [];
            for (const p of merged) {
              if (!p?._id) continue;
              if (seen.has(p._id)) continue;
              seen.add(p._id);
              deduped.push(p);
            }
            return deduped;
          });
        }
        
        if (typeof totalPages === 'number' && totalPages > 0) {
          setHasMore(effectivePage < totalPages);
        } else {
          // Last resort: if we received a full page, assume more pages exist.
          setHasMore(newProducts.length === effectiveLimit);
        }

        setPage(effectivePage);
      }
    } catch (error: any) {
      console.error('Error fetching products:', error);
      Alert.alert(
        'Error',
        error.response?.data?.error?.message || 'Failed to load products'
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setIsLoadingMore(false);
      isLoadingMoreRef.current = false;
    }
  }, [checkConnection]);

  // Fetch products when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      // Tabs keep screens mounted, so we manually reset scroll on focus.
      requestAnimationFrame(() => {
        listRef.current?.scrollToOffset({ offset: 0, animated: false });
      });

      const isSuperAdmin = user?.role === 'superadmin';
      if (isSuperAdmin) {
        setIsLoading(true);
        fetchProducts(1, true);
        return;
      }

      // Vendor: fetch only on first load, or after add/edit marked products as changed.
      const shouldFetchForVendor =
        !vendorHasFetchedOnceRef.current ||
        vendorLastSeenChangeCounterRef.current !== productsChangeCounter;

      if (shouldFetchForVendor) {
        setIsLoading(true);
        fetchProducts(1, true);
        vendorHasFetchedOnceRef.current = true;
        vendorLastSeenChangeCounterRef.current = productsChangeCounter;
      } else {
        // Even if we don't refetch, make sure loaders aren't stuck.
        setIsLoading(false);
      }
    }, [fetchProducts, productsChangeCounter, user?.role])
  );

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchProducts(1, true);
  }, [fetchProducts]);

  const handleLoadMore = useCallback(() => {
    if (isLoadingMoreRef.current) return;
    if (!hasMore || isLoading) return;

    isLoadingMoreRef.current = true;
    setIsLoadingMore(true);
    fetchProducts(page + 1);
  }, [hasMore, isLoading, page, fetchProducts]);

  const handleProductPress = (product: Product) => {
    router.push(`/product/${product._id}`);
  };

  const confirmDeleteProduct = useCallback(
    (product: Product) => {
      Alert.alert(
        'Delete product?',
        `This will permanently delete "${product.name}".`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              const isConnected = await checkConnection();
              if (!isConnected) return;

              setDeletingById((prev) => ({ ...prev, [product._id]: true }));
              try {
                const res = await deleteProduct(product._id);
                if (!res?.success) {
                  throw new Error(res?.error?.message || 'Failed to delete product');
                }

                // Remove from the current list immediately.
                setProducts((prev) => prev.filter((p) => p._id !== product._id));
                // Notify other screens (e.g. add/edit) that products changed.
                markProductsChanged();
              } catch (error: any) {
                Alert.alert(
                  'Error',
                  error?.response?.data?.error?.message ||
                    error?.message ||
                    'Failed to delete product'
                );
              } finally {
                setDeletingById((prev) => {
                  const next = { ...prev };
                  delete next[product._id];
                  return next;
                });
              }
            },
          },
        ]
      );
    },
    [checkConnection, markProductsChanged]
  );

  const getStockStatusColor = (stock: number, threshold: number = 10) => {
    if (stock === 0) return '#EF4444';
    if (stock <= threshold) return '#F59E0B';
    return '#10B981';
  };

  const renderProduct = ({ item }: { item: Product }) => {
    const primaryImage = item.images?.find(img => img.isPrimary) || item.images?.[0];
    const stockThreshold = item.inventory?.lowStockThreshold || 10;
    const isDeleting = !!deletingById[item._id];
    
    return (
      <TouchableOpacity
        style={styles.productCard}
        onPress={() => handleProductPress(item)}
        activeOpacity={0.7}
        disabled={isDeleting}
      >
        <View style={styles.productImageContainer}>
          {primaryImage?.url ? (
            <Image
              source={{ uri: primaryImage.url }}
              style={styles.productImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.placeholderImage}>
              <Text style={styles.placeholderText}>📦</Text>
            </View>
          )}
        </View>
        
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>
            {item.name}
          </Text>
          <View style={styles.metaRow}>
            <View style={styles.categoryPill}>
              <Text style={styles.categoryText} numberOfLines={1}>
                {item.category}
              </Text>
            </View>
          </View>
          
          <View style={styles.productDetails}>
            <View style={styles.priceContainer}>
              {typeof item.discountPrice === 'number' ? (
                <>
                  <Text style={styles.price}>${item.discountPrice.toFixed(2)}</Text>
                  <Text style={styles.originalPrice}>${item.price.toFixed(2)}</Text>
                </>
              ) : (
                <Text style={styles.price}>${item.price.toFixed(2)}</Text>
              )}
            </View>
            
            <View style={[
              styles.stockBadge,
              { backgroundColor: getStockStatusColor(item.stock, stockThreshold) + '20' }
            ]}>
              <View style={[
                styles.stockDot,
                { backgroundColor: getStockStatusColor(item.stock, stockThreshold) }
              ]} />
              <Text style={[
                styles.stockText,
                { color: getStockStatusColor(item.stock, stockThreshold) }
              ]}>
                {item.stock} in stock
              </Text>
            </View>
          </View>
        </View>
        
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`Delete ${item.name}`}
            style={[styles.deleteButton, isDeleting && styles.deleteButtonDisabled]}
            onPress={(e) => {
              (e as any)?.stopPropagation?.();
              if (isDeleting) return;
              confirmDeleteProduct(item);
            }}
            activeOpacity={0.7}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color="#DC2626" />
            ) : (
              <Ionicons name="trash-outline" size={18} color="#DC2626" />
            )}
          </TouchableOpacity>
          <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
        </View>
      </TouchableOpacity>
    );
  };

  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color="#4F46E5" />
      </View>
    );
  };

  const renderEmpty = () => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>📦</Text>
        <Text style={styles.emptyTitle}>No Products Found</Text>
        <Text style={styles.emptyText}>
          Start adding products to your inventory
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header with user info */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.userName}>{user?.name}</Text>
          <Text style={styles.userRole}>
            {user?.role === 'superadmin' ? 'Super Admin' : 'Vendor'}
            {user?.businessName && ` • ${user.businessName}`}
          </Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Products count */}
      <View style={styles.countContainer}>
        <Text style={styles.countText}>
          {products.length} product{products.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Product list */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loadingText}>Loading products...</Text>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={products}
          renderItem={renderProduct}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#4F46E5"
              colors={['#4F46E5']}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F7FB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  welcomeText: {
    fontSize: 14,
    color: '#6B7280',
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  userRole: {
    fontSize: 12,
    color: '#4F46E5',
    marginTop: 2,
  },
  logoutButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
  },
  logoutText: {
    color: '#DC2626',
    fontWeight: '600',
    fontSize: 14,
  },
  countContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  countText: {
    fontSize: 14,
    color: '#6B7280',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#EEF2F7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    alignItems: 'center',
  },
  productImageContainer: {
    width: 76,
    height: 76,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 32,
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
  },
  productName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  categoryPill: {
    maxWidth: '100%',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  productDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
  },
  price: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  originalPrice: {
    fontSize: 13,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
    fontWeight: '600',
  },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  stockDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  stockText: {
    fontSize: 12,
    fontWeight: '500',
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginLeft: 10,
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonDisabled: {
    opacity: 0.7,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#6B7280',
    fontSize: 14,
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});