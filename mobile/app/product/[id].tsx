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
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useAuth } from '../../context/AuthContext';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { getProduct, updateProduct } from '../../services/products';
import { ProductFormData, Product } from '../../types';

const productSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  price: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, 'Price must be a positive number'),
  discountPrice: z.string().optional().refine(val => !val || (!isNaN(parseFloat(val)) && parseFloat(val) > 0), 'Must be a positive number'),
  stock: z.string().refine(val => !isNaN(parseInt(val)) && parseInt(val) >= 0, 'Stock must be 0 or greater'),
  category: z.string().min(2, 'Category is required'),
  description: z.string().optional(),
  length: z.string().optional(),
  breadth: z.string().optional(),
  height: z.string().optional(),
  weight: z.string().optional(),
  lowStockThreshold: z.string().optional(),
}).refine(data => {
  if (data.discountPrice && data.price) {
    return parseFloat(data.discountPrice) < parseFloat(data.price);
  }
  return true;
}, {
  message: 'Discount price must be less than regular price',
  path: ['discountPrice'],
});

export default function EditProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { checkConnection } = useNetworkStatus();
  const router = useRouter();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [hasNewImage, setHasNewImage] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const cameraRef = React.useRef<CameraView>(null);

  const {
    control,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isDirty },
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
    },
  });

  useEffect(() => {
    if (id) {
      loadProduct();
    }
  }, [id]);

  const loadProduct = async () => {
    const isConnected = await checkConnection();
    if (!isConnected) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await getProduct(id as string);
      
      if (response.success && response.data.product) {
        const p = response.data.product;
        setProduct(p);
        
        // Set form values
        reset({
          name: p.name,
          price: p.price.toString(),
          discountPrice: p.discountPrice?.toString() || '',
          stock: p.stock.toString(),
          category: p.category,
          description: p.description || '',
          length: p.length?.toString() || '',
          breadth: p.breadth?.toString() || '',
          height: p.height?.toString() || '',
          weight: p.weight?.toString() || '',
          lowStockThreshold: p.inventory?.lowStockThreshold?.toString() || '10',
        });

        // Set existing image
        const primaryImage = p.images?.find(img => img.isPrimary) || p.images?.[0];
        if (primaryImage?.url) {
          setImageUri(primaryImage.url);
        }
      }
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.error?.message || 'Failed to load product',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleImagePickerOption = () => {
    setShowImagePicker(true);
  };

  const pickImageFromGallery = async () => {
    setShowImagePicker(false);
    
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photo library');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setHasNewImage(true);
    }
  };

  const openCamera = async () => {
    setShowImagePicker(false);
    
    if (!cameraPermission?.granted) {
      const permission = await requestCameraPermission();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Please allow access to your camera');
        return;
      }
    }
    
    setShowCamera(true);
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
        });
        if (photo?.uri) {
          setImageUri(photo.uri);
          setHasNewImage(true);
        }
        setShowCamera(false);
      } catch (error) {
        console.error('Error taking picture:', error);
        Alert.alert('Error', 'Failed to take picture');
      }
    }
  };

  const onSubmit = async (data: ProductFormData) => {
    const isConnected = await checkConnection();
    if (!isConnected) return;

    setIsSubmitting(true);

    try {
      const response = await updateProduct(
        id as string,
        data,
        hasNewImage ? imageUri || undefined : undefined
      );
      
      if (response.success) {
        Alert.alert(
          'Success',
          'Product updated successfully!',
          [
            {
              text: 'OK',
              onPress: () => router.back(),
            },
          ]
        );

        // Show warnings if any
        if (response.warnings?.length) {
          response.warnings.forEach(warning => {
            Alert.alert('Warning', warning.message);
          });
        }
      }
    } catch (error: any) {
      const message = error.response?.data?.error?.message || 'Failed to update product';
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

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Loading product...</Text>
      </View>
    );
  }

  // Camera View Modal
  if (showCamera) {
    return (
      <View style={styles.cameraContainer}>
        <CameraView 
          ref={cameraRef}
          style={styles.camera}
          facing="back"
        >
          <View style={styles.cameraOverlay}>
            <TouchableOpacity 
              style={styles.cameraCloseBtn}
              onPress={() => setShowCamera(false)}
            >
              <Text style={styles.cameraCloseBtnText}>✕</Text>
            </TouchableOpacity>
            
            <View style={styles.cameraBottomBar}>
              <TouchableOpacity 
                style={styles.captureBtn}
                onPress={takePicture}
              >
                <View style={styles.captureBtnInner} />
              </TouchableOpacity>
            </View>
          </View>
        </CameraView>
      </View>
    );
  }

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
          {/* Image Picker */}
          <TouchableOpacity style={styles.imagePicker} onPress={handleImagePickerOption}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.selectedImage} />
            ) : (
              <View style={styles.imagePickerContent}>
                <View style={styles.imageIconContainer}>
                  <Text style={styles.imagePickerIcon}>📷</Text>
                </View>
                <Text style={styles.imagePickerText}>Tap to change image</Text>
                <Text style={styles.imagePickerSubtext}>Take a photo or choose from gallery</Text>
              </View>
            )}
            {imageUri && (
              <View style={styles.changeImageOverlay}>
                <Text style={styles.changeImageText}>Tap to Change Image</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Basic Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            {renderInput('name', 'Product Name', { required: true, placeholder: 'Enter product name' })}
            {renderInput('category', 'Category', { required: true, placeholder: 'e.g., Electronics, Food' })}
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

          {/* Dimensions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Dimensions & Weight</Text>
            <View style={styles.row}>
              <View style={styles.thirdWidth}>
                {renderInput('length', 'L (cm)', { keyboardType: 'decimal-pad' })}
              </View>
              <View style={styles.thirdWidth}>
                {renderInput('breadth', 'B (cm)', { keyboardType: 'decimal-pad' })}
              </View>
              <View style={styles.thirdWidth}>
                {renderInput('height', 'H (cm)', { keyboardType: 'decimal-pad' })}
              </View>
            </View>
            {renderInput('weight', 'Weight (kg)', { keyboardType: 'decimal-pad' })}
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Update Product</Text>
            )}
          </TouchableOpacity>

          {/* Cancel Button */}
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => router.back()}
            disabled={isSubmitting}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Image Picker Modal */}
      <Modal
        visible={showImagePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowImagePicker(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowImagePicker(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Change Product Image</Text>
            
            <TouchableOpacity style={styles.modalOption} onPress={openCamera}>
              <View style={styles.modalOptionIcon}>
                <Text style={styles.modalOptionEmoji}>📸</Text>
              </View>
              <View style={styles.modalOptionText}>
                <Text style={styles.modalOptionTitle}>Take Photo</Text>
                <Text style={styles.modalOptionSubtitle}>Use your camera to capture</Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.modalOption} onPress={pickImageFromGallery}>
              <View style={styles.modalOptionIcon}>
                <Text style={styles.modalOptionEmoji}>🖼️</Text>
              </View>
              <View style={styles.modalOptionText}>
                <Text style={styles.modalOptionTitle}>Choose from Gallery</Text>
                <Text style={styles.modalOptionSubtitle}>Select from your photos</Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.modalCancelBtn}
              onPress={() => setShowImagePicker(false)}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 12,
    color: '#6B7280',
    fontSize: 14,
  },
  imagePicker: {
    width: '100%',
    height: 220,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
  selectedImage: {
    width: '100%',
    height: '100%',
  },
  changeImageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 12,
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
  cancelButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cancelButtonText: {
    color: '#6B7280',
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
    marginBottom: 20,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginBottom: 12,
  },
  modalOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  modalOptionEmoji: {
    fontSize: 22,
  },
  modalOptionText: {
    flex: 1,
  },
  modalOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  modalOptionSubtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  modalCancelBtn: {
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  // Camera styles
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cameraCloseBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 20,
    marginTop: 50,
  },
  cameraCloseBtnText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  cameraBottomBar: {
    alignItems: 'center',
    paddingBottom: 50,
  },
  captureBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureBtnInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
  },
});