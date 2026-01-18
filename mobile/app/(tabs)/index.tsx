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
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { useAuth } from '../../context/AuthContext';
import { useProducts } from '../../context/ProductsContext';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { deleteProduct, getProducts } from '../../services/products';
import { Product } from '../../types';
import { colors, shadows, borderRadius, spacing, getStockStatus } from '../../constants/theme';

const ITEMS_PER_PAGE = 20;

// Minimal Icons
function SearchIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Circle cx="11" cy="11" r="8" stroke={colors.textMuted} strokeWidth={1.5} />
      <Path d="M21 21L16.65 16.65" stroke={colors.textMuted} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

function BoxIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 8V21H3V8M23 3H1V8H23V3Z"
        stroke={colors.textOnPurple}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ChevronRightIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M9 18L15 12L9 6" stroke={colors.textMuted} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function TrashIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 6H5H21M19 6V20C19 21.1 18.1 22 17 22H7C5.9 22 5 21.1 5 20V6M8 6V4C8 2.9 8.9 2 10 2H14C15.1 2 16 2.9 16 4V6"
        stroke={colors.danger}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function LogoutIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 21H5C3.9 21 3 20.1 3 19V5C3 3.9 3.9 3 5 3H9M16 17L21 12M21 12L16 7M21 12H9"
        stroke={colors.textSecondary}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function PlaceholderIcon() {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="3" width="18" height="18" rx="2" stroke={colors.gray300} strokeWidth={1.5} />
      <Circle cx="8.5" cy="8.5" r="1.5" fill={colors.gray300} />
      <Path d="M21 15L16 10L5 21" stroke={colors.gray300} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

type FilterType = 'all' | 'out' | 'low';

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
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

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

  useFocusEffect(
    useCallback(() => {
      requestAnimationFrame(() => {
        listRef.current?.scrollToOffset({ offset: 0, animated: false });
      });

      const isSuperAdmin = user?.role === 'superadmin';
      if (isSuperAdmin) {
        setIsLoading(true);
        fetchProducts(1, true);
        return;
      }

      const shouldFetchForVendor =
        !vendorHasFetchedOnceRef.current ||
        vendorLastSeenChangeCounterRef.current !== productsChangeCounter;

      if (shouldFetchForVendor) {
        setIsLoading(true);
        fetchProducts(1, true);
        vendorHasFetchedOnceRef.current = true;
        vendorLastSeenChangeCounterRef.current = productsChangeCounter;
      } else {
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

                setProducts((prev) => prev.filter((p) => p._id !== product._id));
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

  // Filter products based on active filter
  const filteredProducts = products.filter((p) => {
    if (activeFilter === 'out') return p.stock === 0;
    if (activeFilter === 'low') return p.stock > 0 && p.stock <= (p.inventory?.lowStockThreshold || 10);
    return true;
  });

  // Stats
  const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
  const outOfStockCount = products.filter(p => p.stock === 0).length;
  const lowStockCount = products.filter(p => p.stock > 0 && p.stock <= (p.inventory?.lowStockThreshold || 10)).length;

  const renderProduct = ({ item }: { item: Product }) => {
    const primaryImage = item.images?.find(img => img.isPrimary) || item.images?.[0];
    const stockThreshold = item.inventory?.lowStockThreshold || 10;
    const isDeleting = !!deletingById[item._id];
    const stockStatus = getStockStatus(item.stock, stockThreshold);
    
    return (
      <TouchableOpacity
        style={styles.productCard}
        onPress={() => handleProductPress(item)}
        activeOpacity={0.7}
        disabled={isDeleting}
      >
        {/* Product Image */}
        <View style={styles.productImageContainer}>
          {primaryImage?.url ? (
            <Image
              source={{ uri: primaryImage.url }}
              style={styles.productImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.placeholderImage}>
              <PlaceholderIcon />
            </View>
          )}
        </View>
        
        {/* Product Info */}
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.productSku} numberOfLines={1}>
            SKU: {item.inventory?.sku || item._id.slice(-8).toUpperCase()}
          </Text>
          
          <View style={styles.productFooter}>
            <View style={styles.stockInfo}>
              <Text style={styles.stockCount}>{item.stock} in Stock</Text>
              <View style={[styles.statusBadge, { backgroundColor: stockStatus.bgColor }]}>
                <Text style={[styles.statusText, { color: stockStatus.color }]}>
                  {stockStatus.label}
                </Text>
              </View>
            </View>
          </View>
        </View>
        
        {/* Actions */}
        <View style={styles.productActions}>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={(e) => {
              (e as any)?.stopPropagation?.();
              if (!isDeleting) confirmDeleteProduct(item);
            }}
            disabled={isDeleting}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color={colors.danger} />
            ) : (
              <TrashIcon />
            )}
          </TouchableOpacity>
          <ChevronRightIcon />
        </View>
      </TouchableOpacity>
    );
  };

  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={colors.purple} />
        <Text style={styles.footerText}>Loading more...</Text>
      </View>
    );
  };

  const renderEmpty = () => {
    if (isLoading) return null;
    
    // Show different messages based on active filter
    if (activeFilter === 'out') {
      return (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Svg width={48} height={48} viewBox="0 0 24 24" fill="none">
              <Path
                d="M21 8V21H3V8M23 3H1V8H23V3Z"
                stroke={colors.gray300}
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <Path d="M10 12H14" stroke={colors.gray300} strokeWidth={1.5} strokeLinecap="round" />
            </Svg>
          </View>
          <Text style={styles.emptyTitle}>No Out of Stock Products</Text>
          <Text style={styles.emptyText}>
            All your products are currently in stock
          </Text>
        </View>
      );
    }
    
    if (activeFilter === 'low') {
      return (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Svg width={48} height={48} viewBox="0 0 24 24" fill="none">
              <Path
                d="M21 8V21H3V8M23 3H1V8H23V3Z"
                stroke={colors.gray300}
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <Path d="M10 12H14" stroke={colors.gray300} strokeWidth={1.5} strokeLinecap="round" />
            </Svg>
          </View>
          <Text style={styles.emptyTitle}>No Low Stock Products</Text>
          <Text style={styles.emptyText}>
            All your products have sufficient stock levels
          </Text>
        </View>
      );
    }
    
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconContainer}>
          <Svg width={48} height={48} viewBox="0 0 24 24" fill="none">
            <Path
              d="M21 8V21H3V8M23 3H1V8H23V3Z"
              stroke={colors.gray300}
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Path d="M10 12H14" stroke={colors.gray300} strokeWidth={1.5} strokeLinecap="round" />
          </Svg>
        </View>
        <Text style={styles.emptyTitle}>No Products Yet</Text>
        <Text style={styles.emptyText}>
          Start adding products to your inventory
        </Text>
        <TouchableOpacity 
          style={styles.emptyButton}
          onPress={() => router.push('/(tabs)/add')}
          activeOpacity={0.8}
        >
          <Text style={styles.emptyButtonText}>Add First Product</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      {/* User Card */}
      <View style={styles.userCard}>
        <View style={styles.userAvatar}>
          <Text style={styles.userInitial}>
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.welcomeText}>Welcome back</Text>
          <Text style={styles.userName}>{user?.name}</Text>
          <View style={styles.roleContainer}>
            <View style={[
              styles.roleBadge,
              user?.role === 'superadmin' && styles.roleBadgeAdmin
            ]}>
              <Text style={[
                styles.roleText,
                user?.role === 'superadmin' && styles.roleTextAdmin
              ]}>
                {user?.role === 'superadmin' ? 'Super Admin' : 'Vendor'}
              </Text>
            </View>
          </View>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={logout} activeOpacity={0.7}>
          <LogoutIcon />
        </TouchableOpacity>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        {/* Primary Stat - Purple */}
        <View style={styles.primaryStatCard}>
          <View style={styles.statHeader}>
            <View style={styles.statIconContainer}>
              <BoxIcon />
            </View>
            <Text style={styles.statPeriod}>Total</Text>
          </View>
          <Text style={styles.primaryStatValue}>{totalStock}</Text>
          <Text style={styles.primaryStatLabel}>Total Stock</Text>
        </View>

        {/* Secondary Stats */}
        <View style={styles.secondaryStats}>
          <View style={styles.secondaryStatCard}>
            <Text style={styles.secondaryStatValue}>{outOfStockCount}</Text>
            <Text style={styles.secondaryStatLabel}>Out of Stock</Text>
          </View>
          <View style={styles.secondaryStatCard}>
            <Text style={styles.secondaryStatValue}>{lowStockCount}</Text>
            <Text style={styles.secondaryStatLabel}>Low Stock</Text>
          </View>
        </View>
      </View>

      {/* Filter Pills */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          <TouchableOpacity
            style={[styles.filterPill, activeFilter === 'all' && styles.filterPillActive]}
            onPress={() => setActiveFilter('all')}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterText, activeFilter === 'all' && styles.filterTextActive]}>
              Total Stock
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterPill, activeFilter === 'out' && styles.filterPillActive]}
            onPress={() => setActiveFilter('out')}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterText, activeFilter === 'out' && styles.filterTextActive]}>
              Out of Stock
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterPill, activeFilter === 'low' && styles.filterPillActive]}
            onPress={() => setActiveFilter('low')}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterText, activeFilter === 'low' && styles.filterTextActive]}>
              Low Stock
            </Text>
          </TouchableOpacity>
        </ScrollView>
        
        {/* TODO: Enable search functionality in future
        <TouchableOpacity style={styles.searchButton} activeOpacity={0.7}>
          <SearchIcon />
        </TouchableOpacity>
        */}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.purple} />
            <Text style={styles.loadingText}>Loading inventory...</Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={filteredProducts}
            renderItem={renderProduct}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={renderHeader}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor={colors.purple}
                colors={[colors.purple]}
              />
            }
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={renderFooter}
            ListEmptyComponent={renderEmpty}
            showsVerticalScrollIndicator={false}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...shadows.sm,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.purple,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  userInitial: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textOnPurple,
  },
  userInfo: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 2,
  },
  userName: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: colors.purpleLight,
  },
  roleBadgeAdmin: {
    backgroundColor: colors.dangerLight,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.purple,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  roleTextAdmin: {
    color: colors.danger,
  },
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  primaryStatCard: {
    flex: 1,
    backgroundColor: colors.purple,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.lg,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statPeriod: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
  primaryStatValue: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.textOnPurple,
    marginBottom: 4,
  },
  primaryStatLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  secondaryStats: {
    flex: 1,
    gap: spacing.md,
  },
  secondaryStatCard: {
    flex: 1,
    backgroundColor: colors.cardBg,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...shadows.sm,
  },
  secondaryStatValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  secondaryStatLabel: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  filterScroll: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  filterPill: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterPillActive: {
    backgroundColor: colors.textPrimary,
    borderColor: colors.textPrimary,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  filterTextActive: {
    color: colors.background,
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 120,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...shadows.sm,
  },
  productImageContainer: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.surface,
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
  productInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  productSku: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  productFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stockInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stockCount: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  productActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginLeft: spacing.sm,
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.dangerLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '500',
    marginTop: spacing.md,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  footerText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: spacing.xxxl,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  emptyButton: {
    backgroundColor: colors.purple,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
    ...shadows.lg,
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textOnPurple,
  },
});
