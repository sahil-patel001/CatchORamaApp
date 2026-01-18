import React, { useState, useEffect } from 'react';
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
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { createProduct, getCategories } from '../../services/products';
import { ProductFormData } from '../../types';

const productSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  price: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, 'Price must be a positive number'),
  discountPrice: z.string().optional().refine(val => !val || (!isNaN(parseFloat(val)) && parseFloat(val) > 0), 'Must be a positive number'),
  stock: z.string().refine(val => !isNaN(parseInt(val)) && parseInt(val) >= 0, 'Stock must be 0 or greater'),
  category: z.string().min(1, 'Category is required'),
  description: z.string().optional(),
  length: z.string().min(1, 'Length is required').refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, 'Must be a positive number'),
  breadth: z.string().min(1, 'Breadth is required').refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, 'Must be a positive number'),
  height: z.string().min(1, 'Height is required').refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, 'Must be a positive number'),
  weight: z.string().min(1, 'Weight is required').refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, 'Must be a positive number'),
  lowStockThreshold: z.string().optional(),
  vendorId: z.string().optional(),
}).refine(data => {
  if (data.discountPrice && data.price) {
    return parseFloat(data.discountPrice) < parseFloat(data.price);
  }
  return true;
}, {
  message: 'Discount price must be less than regular price',
  path: ['discountPrice'],
});

export default function AddProductScreen() {
  const { user } = useAuth();
  const { checkConnection } = useNetworkStatus();
  const router = useRouter();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const isSuperAdmin = user?.role === 'superadmin';

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
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

  useEffect(() => {
    loadCategories();
  }, []);

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

  // Use native OS image picker
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

  const onSubmit = async (data: ProductFormData) => {
    const isConnected = await checkConnection();
    if (!isConnected) return;

    setIsSubmitting(true);

    try {
      const response = await createProduct(data, imageUri || undefined);
      
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
        {options.required && <Text style={styles.required}> *</Text>}
      </Text>
      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            style={[
              styles.input,
              options.multiline && styles.multilineInput,
              errors[name] && styles.inputError,
            ]}
            placeholder={options.placeholder || label}
            placeholderTextColor="#9CA3AF"
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            keyboardType={options.keyboardType || 'default'}
            multiline={options.multiline}
            numberOfLines={options.multiline ? 4 : 1}
          />
        )}
      />
      {errors[name] && (
        <Text style={styles.errorText}>{errors[name]?.message}</Text>
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
          errors.category && styles.inputError,
        ]}
        onPress={() => setShowCategoryPicker(true)}
        disabled={isLoadingCategories}
      >
        {isLoadingCategories ? (
          <ActivityIndicator size="small" color="#6B7280" />
        ) : (
          <>
            <Text style={[
              styles.pickerButtonText,
              !selectedCategory && styles.pickerPlaceholder
            ]}>
              {selectedCategory || 'Select a category'}
            </Text>
            <Text style={styles.pickerArrow}>▼</Text>
          </>
        )}
      </TouchableOpacity>
      {errors.category && (
        <Text style={styles.errorText}>{errors.category.message}</Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Add New Product</Text>
          <Text style={styles.subtitle}>Fill in the details below</Text>

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
                >
                  <Text style={styles.removeImageText}>✕</Text>
                </TouchableOpacity>
                <View style={styles.changeImageOverlay}>
                  <Text style={styles.changeImageText}>Tap to Change</Text>
                </View>
              </View>
            ) : (
              <View style={styles.imagePickerContent}>
                <View style={styles.imageIconContainer}>
                  <Text style={styles.imagePickerIcon}>📷</Text>
                </View>
                <Text style={styles.imagePickerText}>Tap to add product image</Text>
                <Text style={styles.imagePickerSubtext}>Take a photo or choose from gallery</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Basic Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            {renderInput('name', 'Product Name', { required: true, placeholder: 'Enter product name' })}
            {renderCategoryPicker()}
            {renderInput('description', 'Description', { multiline: true, placeholder: 'Product description...' })}
          </View>

          {/* Pricing */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pricing & Stock</Text>
            <View style={styles.row}>
              <View style={styles.halfWidth}>
                {renderInput('price', 'Price ($)', { required: true, keyboardType: 'decimal-pad' })}
              </View>
              <View style={styles.halfWidth}>
                {renderInput('discountPrice', 'Discount Price', { keyboardType: 'decimal-pad' })}
              </View>
            </View>
            <View style={styles.row}>
              <View style={styles.halfWidth}>
                {renderInput('stock', 'Stock', { required: true, keyboardType: 'numeric' })}
              </View>
              <View style={styles.halfWidth}>
                {renderInput('lowStockThreshold', 'Low Stock Alert', { keyboardType: 'numeric' })}
              </View>
            </View>
          </View>

          {/* Dimensions - All Required */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Dimensions & Weight</Text>
            <View style={styles.row}>
              <View style={styles.thirdWidth}>
                {renderInput('length', 'L (cm)', { required: true, keyboardType: 'decimal-pad', placeholder: '0' })}
              </View>
              <View style={styles.thirdWidth}>
                {renderInput('breadth', 'B (cm)', { required: true, keyboardType: 'decimal-pad', placeholder: '0' })}
              </View>
              <View style={styles.thirdWidth}>
                {renderInput('height', 'H (cm)', { required: true, keyboardType: 'decimal-pad', placeholder: '0' })}
              </View>
            </View>
            {renderInput('weight', 'Weight (kg)', { required: true, keyboardType: 'decimal-pad', placeholder: '0' })}
          </View>

          {/* Vendor ID - Only for Superadmin */}
          {isSuperAdmin && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Vendor Assignment</Text>
              {renderInput('vendorId', 'Vendor ID', { required: true, placeholder: 'Enter vendor ID' })}
            </View>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Create Product</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Category Picker Modal */}
      <Modal
        visible={showCategoryPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCategoryPicker(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCategoryPicker(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Select Category</Text>
            
            {categories.length === 0 ? (
              <View style={styles.emptyCategoriesContainer}>
                <Text style={styles.emptyCategoriesText}>No categories available</Text>
                <TouchableOpacity style={styles.retryButton} onPress={loadCategories}>
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={categories}
                keyExtractor={(item) => item}
                style={styles.categoryList}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.categoryItem,
                      selectedCategory === item && styles.categoryItemSelected
                    ]}
                    onPress={() => handleCategorySelect(item)}
                  >
                    <Text style={[
                      styles.categoryItemText,
                      selectedCategory === item && styles.categoryItemTextSelected
                    ]}>
                      {item}
                    </Text>
                    {selectedCategory === item && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </TouchableOpacity>
                )}
              />
            )}
            
            <TouchableOpacity 
              style={styles.modalCancelBtn}
              onPress={() => setShowCategoryPicker(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
  },
  imagePicker: {
    width: '100%',
    height: 200,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    overflow: 'hidden',
    marginBottom: 24,
  },
  imagePickerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  imagePickerIcon: {
    fontSize: 28,
  },
  imagePickerText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  imagePickerSubtext: {
    color: '#9CA3AF',
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
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  changeImageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 10,
    alignItems: 'center',
  },
  changeImageText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  required: {
    color: '#EF4444',
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  multilineInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  thirdWidth: {
    flex: 1,
  },
  // Picker styles
  pickerButton: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#111827',
  },
  pickerPlaceholder: {
    color: '#9CA3AF',
  },
  pickerArrow: {
    fontSize: 12,
    color: '#6B7280',
  },
  submitButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
    maxHeight: '70%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  categoryList: {
    maxHeight: 300,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    marginBottom: 8,
  },
  categoryItemSelected: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#4F46E5',
  },
  categoryItemText: {
    fontSize: 16,
    color: '#374151',
  },
  categoryItemTextSelected: {
    color: '#4F46E5',
    fontWeight: '600',
  },
  checkmark: {
    fontSize: 18,
    color: '#4F46E5',
    fontWeight: '600',
  },
  emptyCategoriesContainer: {
    alignItems: 'center',
    padding: 20,
  },
  emptyCategoriesText: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 12,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#4F46E5',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  modalCancelBtn: {
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
});
