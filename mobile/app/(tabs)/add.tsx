import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
  ActionSheetIOS,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { useAuth } from '../../context/AuthContext';
import { useProducts } from '../../context/ProductsContext';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { createProduct, getCategories } from '../../services/products';
import { ProductFormData } from '../../types';
import { colors, shadows, borderRadius, spacing } from '../../constants/theme';

const buildProductSchema = (requireVendorId: boolean) =>
  z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    price: z
      .string()
      .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, 'Price must be a positive number'),
    discountPrice: z
      .string()
      .optional()
      .refine((val) => !val || (!isNaN(parseFloat(val)) && parseFloat(val) > 0), 'Must be a positive number'),
    stock: z
      .string()
      .refine((val) => !isNaN(parseInt(val)) && parseInt(val) >= 0, 'Stock must be 0 or greater'),
    category: z.string().min(1, 'Category is required'),
    description: z.string().optional(),
    length: z
      .string()
      .min(1, 'Length is required')
      .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, 'Must be a positive number'),
    breadth: z
      .string()
      .min(1, 'Breadth is required')
      .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, 'Must be a positive number'),
    height: z
      .string()
      .min(1, 'Height is required')
      .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, 'Must be a positive number'),
    weight: z
      .string()
      .min(1, 'Weight is required')
      .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, 'Must be a positive number'),
    lowStockThreshold: z.preprocess(
      (val) => (val === undefined || val === '' ? undefined : parseInt(String(val), 10)),
      z.number().int().nonnegative().optional()
    ),
    vendorId: requireVendorId ? z.string().min(1, 'Vendor ID is required') : z.string().optional(),
  })
    .refine((data) => {
      if (data.discountPrice && data.price) {
        return parseFloat(data.discountPrice) < parseFloat(data.price);
      }
      return true;
    }, {
      message: 'Discount price must be less than regular price',
      path: ['discountPrice'],
    });

// Icons
function CameraIcon({ color = colors.purple }: { color?: string }) {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
      <Path
        d="M23 19C23 20.1 22.1 21 21 21H3C1.9 21 1 20.1 1 19V8C1 6.9 1.9 6 3 6H7L9 3H15L17 6H21C22.1 6 23 6.9 23 8V19Z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="13" r="4" stroke={color} strokeWidth={1.5} />
    </Svg>
  );
}

function CloseIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M18 6L6 18M6 6L18 18" stroke={colors.textOnPurple} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function LayersIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2L2 7L12 12L22 7L12 2Z" stroke={colors.purple} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M2 17L12 22L22 17" stroke={colors.purple} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M2 12L12 17L22 12" stroke={colors.purple} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function DollarIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 1V23M17 5H9.5C8.57 5 7.68 5.37 7.02 6.02C6.37 6.68 6 7.57 6 8.5C6 9.43 6.37 10.32 7.02 10.98C7.68 11.63 8.57 12 9.5 12H14.5C15.43 12 16.32 12.37 16.98 13.02C17.63 13.68 18 14.57 18 15.5C18 16.43 17.63 17.32 16.98 17.98C16.32 18.63 15.43 19 14.5 19H6"
        stroke={colors.purple}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function RulerIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 16V8C21 6.9 20.1 6 19 6H5C3.9 6 3 6.9 3 8V16C3 17.1 3.9 18 5 18H19C20.1 18 21 17.1 21 16Z"
        stroke={colors.purple}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M3 10H21M7 6V18" stroke={colors.purple} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

function UserIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 21V19C20 16.79 18.21 15 16 15H8C5.79 15 4 16.79 4 19V21M12 11C14.21 11 16 9.21 16 7C16 4.79 14.21 3 12 3C9.79 3 8 4.79 8 7C8 9.21 9.79 11 12 11Z"
        stroke={colors.danger}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function GridIcon({ color = colors.textMuted }: { color?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="3" width="7" height="7" rx="2" stroke={color} strokeWidth={1.5} />
      <Rect x="14" y="3" width="7" height="7" rx="2" stroke={color} strokeWidth={1.5} />
      <Rect x="3" y="14" width="7" height="7" rx="2" stroke={color} strokeWidth={1.5} />
      <Rect x="14" y="14" width="7" height="7" rx="2" stroke={color} strokeWidth={1.5} />
    </Svg>
  );
}

function ChevronDownIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M6 9L12 15L18 9" stroke={colors.textMuted} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function CheckIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M20 6L9 17L4 12" stroke={colors.purple} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function AlertIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={colors.danger} strokeWidth={1.5} />
      <Path d="M12 8V12M12 16H12.01" stroke={colors.danger} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function PlusIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M12 5V19M5 12H19" stroke={colors.textOnPurple} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export default function AddProductScreen() {
  const { user } = useAuth();
  const { markProductsChanged } = useProducts();
  const { checkConnection } = useNetworkStatus();
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const isSuperAdmin = user?.role === 'superadmin';
  const isVendor = user?.role === 'vendor';

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(buildProductSchema(isSuperAdmin)),
    defaultValues: {
      name: '',
      price: '',
      discountPrice: '',
      stock: '0',
      category: '',
      description: '',
      length: '',
      breadth: '',
      height: '',
      weight: '',
      lowStockThreshold: '10',
      vendorId: '',
    },
  });

  const selectedCategory = watch('category');

  useFocusEffect(
    useCallback(() => {
      requestAnimationFrame(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: false });
      });
    }, [])
  );

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (isVendor && user?.vendorId) {
      setValue('vendorId', user.vendorId, { shouldValidate: false, shouldDirty: false });
    }
  }, [isVendor, user?.vendorId, setValue]);

  const loadCategories = async () => {
    setIsLoadingCategories(true);
    try {
      const result = await getCategories();
      if (result.categories && result.categories.length > 0) {
        setCategories(result.categories);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
      Alert.alert('Error', 'Failed to load categories. Please try again.');
    } finally {
      setIsLoadingCategories(false);
    }
  };

  const showImagePickerOptions = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose from Library'],
          cancelButtonIndex: 0,
          title: 'Add Product Image',
        },
        async (buttonIndex) => {
          if (buttonIndex === 1) {
            await takePhoto();
          } else if (buttonIndex === 2) {
            await pickFromGallery();
          }
        }
      );
    } else {
      Alert.alert(
        'Add Product Image',
        'Choose an option',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Take Photo', onPress: takePhoto },
          { text: 'Choose from Library', onPress: pickFromGallery },
        ],
        { cancelable: true }
      );
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Camera access is required to take photos. Please enable it in your device settings.',
          [{ text: 'OK' }]
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to open camera. Please try again.');
    }
  };

  const pickFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Photo library access is required to select images. Please enable it in your device settings.',
          [{ text: 'OK' }]
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Gallery error:', error);
      Alert.alert('Error', 'Failed to open gallery. Please try again.');
    }
  };

  const removeImage = () => {
    Alert.alert(
      'Remove Image',
      'Are you sure you want to remove this image?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => setImageUri(null) },
      ]
    );
  };

  const handleCategorySelect = (category: string) => {
    setValue('category', category, { shouldValidate: true });
    setShowCategoryPicker(false);
  };

  const handleCancel = () => {
    reset();
    setImageUri(null);
    setShowCategoryPicker(false);
    router.replace('/(tabs)');
  };

  const onSubmit = async (data: ProductFormData) => {
    const isConnected = await checkConnection();
    if (!isConnected) return;

    setIsSubmitting(true);

    try {
      const payload: ProductFormData = { ...data };
      if (!isSuperAdmin) {
        const resolvedVendorId = (user?.vendorId || '').trim();
        if (!resolvedVendorId) {
          setIsSubmitting(false);
          Alert.alert('Error', 'Your account is missing a vendorId. Please log out and log back in, or contact support.');
          return;
        }
        payload.vendorId = resolvedVendorId;
      } else if (typeof payload.vendorId === 'string') {
        payload.vendorId = payload.vendorId.trim();
      }

      const response = await createProduct(payload, imageUri || undefined);
      
      if (response.success) {
        Alert.alert(
          'Success',
          'Product created successfully!',
          [
            {
              text: 'OK',
              onPress: () => {
                reset();
                setImageUri(null);
                markProductsChanged();
                router.push('/(tabs)');
              },
            },
          ]
        );

        if (response.warnings?.length) {
          response.warnings.forEach(warning => {
            Alert.alert('Warning', warning.message);
          });
        }
      }
    } catch (error: any) {
      const message = error.response?.data?.error?.message || 'Failed to create product';
      Alert.alert('Error', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderInput = (
    name: keyof ProductFormData,
    label: string,
    options: {
      placeholder?: string;
      keyboardType?: 'default' | 'numeric' | 'decimal-pad';
      multiline?: boolean;
      required?: boolean;
    } = {}
  ) => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>
        {label}
        {options.required ? (
          <Text style={styles.required}> *</Text>
        ) : (
          <Text style={styles.optionalTag}> (Optional)</Text>
        )}
      </Text>
      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, onBlur, value } }) => (
          <View style={[
            styles.inputWrapper,
            focusedField === name && styles.inputWrapperFocused,
            errors[name] && styles.inputWrapperError,
            options.multiline && styles.inputWrapperMultiline,
          ]}>
            <TextInput
              style={[
                styles.input,
                options.multiline && styles.multilineInput,
              ]}
              placeholder={options.placeholder || label}
              placeholderTextColor={colors.inputPlaceholder}
              onFocus={() => setFocusedField(name)}
              onBlur={() => {
                setFocusedField(null);
                onBlur();
              }}
              onChangeText={onChange}
              value={value}
              keyboardType={options.keyboardType || 'default'}
              multiline={options.multiline}
              numberOfLines={options.multiline ? 4 : 1}
              textAlignVertical={options.multiline ? 'top' : 'center'}
            />
          </View>
        )}
      />
      {errors[name] && (
        <View style={styles.errorContainer}>
          <AlertIcon />
          <Text style={styles.errorText}>{errors[name]?.message}</Text>
        </View>
      )}
    </View>
  );

  const renderCategoryPicker = () => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>
        Category<Text style={styles.required}> *</Text>
      </Text>
      <TouchableOpacity
        style={[
          styles.pickerButton,
          focusedField === 'category' && styles.inputWrapperFocused,
          errors.category && styles.inputWrapperError,
        ]}
        onPress={() => {
          setFocusedField('category');
          setShowCategoryPicker(true);
        }}
        disabled={isLoadingCategories}
        activeOpacity={0.7}
      >
        {isLoadingCategories ? (
          <ActivityIndicator size="small" color={colors.purple} />
        ) : (
          <>
            <View style={styles.pickerContent}>
              <GridIcon color={selectedCategory ? colors.purple : colors.textMuted} />
              <Text style={[
                styles.pickerButtonText,
                !selectedCategory && styles.pickerPlaceholder
              ]}>
                {selectedCategory || 'Select a category'}
              </Text>
            </View>
            <ChevronDownIcon />
          </>
        )}
      </TouchableOpacity>
      {errors.category && (
        <View style={styles.errorContainer}>
          <AlertIcon />
          <Text style={styles.errorText}>{errors.category.message}</Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}
        >
          <ScrollView
            ref={scrollViewRef}
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Add New Product</Text>
              <Text style={styles.subtitle}>Add a new item to your inventory</Text>
            </View>

            {/* Image Picker */}
            <TouchableOpacity 
              style={styles.imagePicker} 
              onPress={showImagePickerOptions}
              activeOpacity={0.7}
            >
              {imageUri ? (
                <View style={styles.selectedImageContainer}>
                  <Image source={{ uri: imageUri }} style={styles.selectedImage} />
                  <TouchableOpacity 
                    style={styles.removeImageBtn}
                    onPress={removeImage}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <CloseIcon />
                  </TouchableOpacity>
                  <View style={styles.changeImageOverlay}>
                    <CameraIcon color={colors.textOnPurple} />
                    <Text style={styles.changeImageText}>Tap to Change</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.imagePickerContent}>
                  <View style={styles.imageIconContainer}>
                    <CameraIcon />
                  </View>
                  <Text style={styles.imagePickerText}>Add Product Image</Text>
                  <Text style={styles.imagePickerSubtext}>Take a photo or choose from gallery</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Basic Info Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIconContainer}>
                  <LayersIcon />
                </View>
                <Text style={styles.sectionTitle}>Basic Information</Text>
              </View>
              {renderInput('name', 'Product Name', { required: true, placeholder: 'Enter product name' })}
              {renderCategoryPicker()}
              {renderInput('description', 'Description', { multiline: true, placeholder: 'Describe your product...' })}
            </View>

            {/* Pricing Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIconContainer}>
                  <DollarIcon />
                </View>
                <Text style={styles.sectionTitle}>Pricing & Stock</Text>
              </View>
              <View style={styles.row}>
                <View style={styles.halfWidth}>
                  {renderInput('price', 'Price ($)', { required: true, keyboardType: 'decimal-pad', placeholder: '0.00' })}
                </View>
                <View style={styles.halfWidth}>
                  {renderInput('discountPrice', 'Sale Price', { keyboardType: 'decimal-pad', placeholder: '0.00' })}
                </View>
              </View>
              <View style={styles.row}>
                <View style={styles.halfWidth}>
                  {renderInput('stock', 'Stock Qty', { required: true, keyboardType: 'numeric', placeholder: '0' })}
                </View>
                <View style={styles.halfWidth}>
                  {renderInput('lowStockThreshold', 'Low Stock Alert', { keyboardType: 'numeric', placeholder: '10' })}
                </View>
              </View>
            </View>

            {/* Dimensions Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIconContainer}>
                  <RulerIcon />
                </View>
                <Text style={styles.sectionTitle}>Dimensions & Weight</Text>
              </View>
              <View style={styles.row}>
                <View style={styles.thirdWidth}>
                  {renderInput('length', 'L (cm)', { required: true, keyboardType: 'decimal-pad', placeholder: '0' })}
                </View>
                <View style={styles.thirdWidth}>
                  {renderInput('breadth', 'W (cm)', { required: true, keyboardType: 'decimal-pad', placeholder: '0' })}
                </View>
                <View style={styles.thirdWidth}>
                  {renderInput('height', 'H (cm)', { required: true, keyboardType: 'decimal-pad', placeholder: '0' })}
                </View>
              </View>
              {renderInput('weight', 'Weight (kg)', { required: true, keyboardType: 'decimal-pad', placeholder: '0.00' })}
            </View>

            {/* Vendor ID - Only for Superadmin */}
            {isSuperAdmin && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionIconContainer, styles.sectionIconDanger]}>
                    <UserIcon />
                  </View>
                  <Text style={styles.sectionTitle}>Vendor Assignment</Text>
                </View>
                {renderInput('vendorId', 'Vendor ID', { required: true, placeholder: 'Enter vendor ID' })}
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.cancelButton, isSubmitting && styles.buttonDisabled]}
                onPress={handleCancel}
                disabled={isSubmitting}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                onPress={handleSubmit(onSubmit)}
                disabled={isSubmitting}
                activeOpacity={0.8}
              >
                {isSubmitting ? (
                  <ActivityIndicator color={colors.textOnPurple} />
                ) : (
                  <>
                    <PlusIcon />
                    <Text style={styles.submitButtonText}>Add Product</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
            
            {/* Bottom spacing for tab bar */}
            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Category Picker Modal */}
      <Modal
        visible={showCategoryPicker}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowCategoryPicker(false);
          setFocusedField(null);
        }}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            setShowCategoryPicker(false);
            setFocusedField(null);
          }}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Select Category</Text>
            
            {categories.length === 0 ? (
              <View style={styles.emptyCategoriesContainer}>
                <GridIcon color={colors.textMuted} />
                <Text style={styles.emptyCategoriesText}>No categories available</Text>
                <TouchableOpacity style={styles.retryButton} onPress={loadCategories} activeOpacity={0.7}>
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={categories}
                keyExtractor={(item) => item}
                style={styles.categoryList}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.categoryItem,
                      selectedCategory === item && styles.categoryItemSelected
                    ]}
                    onPress={() => handleCategorySelect(item)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.categoryItemText,
                      selectedCategory === item && styles.categoryItemTextSelected
                    ]}>
                      {item}
                    </Text>
                    {selectedCategory === item && (
                      <View style={styles.checkmarkContainer}>
                        <CheckIcon />
                      </View>
                    )}
                  </TouchableOpacity>
                )}
              />
            )}
            
            <TouchableOpacity 
              style={styles.modalCancelBtn}
              onPress={() => {
                setShowCategoryPicker(false);
                setFocusedField(null);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 120,
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textMuted,
  },
  imagePicker: {
    width: '100%',
    height: 180,
    backgroundColor: colors.cardBg,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    overflow: 'hidden',
    marginBottom: spacing.xl,
  },
  imagePickerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageIconContainer: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.purpleLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  imagePickerText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  imagePickerSubtext: {
    color: colors.textMuted,
    fontSize: 13,
  },
  selectedImageContainer: {
    flex: 1,
    position: 'relative',
  },
  selectedImage: {
    width: '100%',
    height: '100%',
  },
  removeImageBtn: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.purple,
    justifyContent: 'center',
    alignItems: 'center',
  },
  changeImageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    gap: spacing.sm,
  },
  changeImageText: {
    color: colors.textOnPurple,
    fontSize: 14,
    fontWeight: '500',
  },
  section: {
    backgroundColor: colors.cardBg,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...shadows.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  sectionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.purpleLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  sectionIconDanger: {
    backgroundColor: colors.dangerLight,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  inputContainer: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  required: {
    color: colors.danger,
  },
  optionalTag: {
    color: colors.textMuted,
    fontWeight: '400',
    fontSize: 11,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderWidth: 1.5,
    borderColor: colors.inputBorder,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  inputWrapperFocused: {
    borderColor: colors.purple,
    backgroundColor: colors.purpleSubtle,
  },
  inputWrapperError: {
    borderColor: colors.danger,
  },
  inputWrapperMultiline: {
    alignItems: 'flex-start',
  },
  input: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: '400',
  },
  multilineInput: {
    height: 100,
    paddingTop: spacing.md,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '500',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfWidth: {
    flex: 1,
  },
  thirdWidth: {
    flex: 1,
  },
  pickerButton: {
    backgroundColor: colors.inputBg,
    borderWidth: 1.5,
    borderColor: colors.inputBorder,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
  },
  pickerButtonText: {
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: '400',
  },
  pickerPlaceholder: {
    color: colors.inputPlaceholder,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  cancelButton: {
    flex: 0.4,
    backgroundColor: colors.cardBg,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  submitButton: {
    flex: 0.6,
    backgroundColor: colors.purple,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    ...shadows.lg,
  },
  submitButtonDisabled: {
    backgroundColor: colors.purpleMuted,
  },
  submitButtonText: {
    color: colors.textOnPurple,
    fontSize: 15,
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    paddingBottom: 40,
    maxHeight: '70%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.gray300,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  categoryList: {
    maxHeight: 300,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryItemSelected: {
    backgroundColor: colors.purpleLight,
    borderColor: colors.purple,
  },
  categoryItemText: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  categoryItemTextSelected: {
    color: colors.purple,
    fontWeight: '600',
  },
  checkmarkContainer: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.purpleSubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCategoriesContainer: {
    alignItems: 'center',
    padding: spacing.xxxl,
    gap: spacing.md,
  },
  emptyCategoriesText: {
    fontSize: 15,
    color: colors.textMuted,
  },
  retryButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.purple,
    borderRadius: borderRadius.md,
  },
  retryButtonText: {
    color: colors.textOnPurple,
    fontWeight: '600',
    fontSize: 14,
  },
  modalCancelBtn: {
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});
