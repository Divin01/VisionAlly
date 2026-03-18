import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
  Platform,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { auth, firestore } from '../../../firebase';
import { collection, doc, setDoc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MAX_CONTACTS = 5;
const STORAGE_KEY = '@safelink_trusted_contacts';

export default function TrustedContactsScreen() {
  const [activeTab, setActiveTab] = useState('contacts');
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [selectedSecurity, setSelectedSecurity] = useState(null);
  const [securityModalVisible, setSecurityModalVisible] = useState(false);
  
  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');
  const [editingId, setEditingId] = useState(null);
  
  // Filter/Sort states
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');

  const securityServices = [
    {
      id: 'raid',
      name: 'RAID',
      description: 'Rapid Armed Immediate Deployment',
      phone: '0861 007 243',
      features: ['24/7 Armed Response', 'GPS Tracking', '< 5 min Response Time'],
      color: '#4B5563',
      icon: 'shield-alert',
      isPro: true,
    },
    {
      id: 'fidelity',
      name: 'Fidelity Security',
      description: 'Trusted Security Solutions',
      phone: '0860 000 022',
      features: ['Armed Response', 'CCTV Monitoring', 'Alarm Systems'],
      color: '#7C3AED',
      icon: 'shield-check',
      isPro: true,
    },
    {
      id: 'g4s',
      name: 'G4S South Africa',
      description: 'Global Security Services',
      phone: '0860 003 417',
      features: ['Emergency Response', 'Security Guards', 'Risk Management'],
      color: '#0891B2',
      icon: 'security',
      isPro: true,
    },
  ];

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      setLoading(true);
      const userId = auth.currentUser?.uid;

      if (userId) {
        // Try loading from Firebase first
        const docRef = doc(firestore, 'trustedContacts', userId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setContacts(data.contacts || []);
          // Sync to local storage
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data.contacts || []));
        } else {
          // Load from local storage if Firebase has no data
          const localData = await AsyncStorage.getItem(STORAGE_KEY);
          if (localData) {
            const parsedContacts = JSON.parse(localData);
            setContacts(parsedContacts);
            // Sync to Firebase
            await setDoc(docRef, { contacts: parsedContacts, userId });
          }
        }
      } else {
        // Not logged in, load from local storage only
        const localData = await AsyncStorage.getItem(STORAGE_KEY);
        if (localData) {
          setContacts(JSON.parse(localData));
        }
      }
    } catch (error) {
      console.error('Error loading contacts:', error);
      Alert.alert('Error', 'Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  const saveContacts = async (updatedContacts) => {
    try {
      const userId = auth.currentUser?.uid;

      // Save to local storage
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedContacts));

      // Save to Firebase if logged in
      if (userId) {
        const docRef = doc(firestore, 'trustedContacts', userId);
        await setDoc(docRef, { 
          contacts: updatedContacts, 
          userId,
          updatedAt: new Date().toISOString() 
        });
      }

      setContacts(updatedContacts);
      return true;
    } catch (error) {
      console.error('Error saving contacts:', error);
      Alert.alert('Error', 'Failed to save contact');
      return false;
    }
  };

  const validateForm = () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Please enter a name');
      return false;
    }
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Validation Error', 'Please enter a valid email');
      return false;
    }
    if (!phone.trim() || phone.length !== 9 || !/^\d+$/.test(phone)) {
      Alert.alert('Validation Error', 'Please enter a valid 9-digit phone number');
      return false;
    }
    return true;
  };

  const handleAddContact = async () => {
    if (!validateForm()) return;

    if (!editingId && contacts.length >= MAX_CONTACTS) {
      Alert.alert(
        'Maximum Contacts Reached',
        `You can only have ${MAX_CONTACTS} trusted contacts. Please remove an existing contact to add a new one.`,
        [{ text: 'OK' }]
      );
      return;
    }

    setSaving(true);
    try {
      const newContact = {
        id: editingId || `contact_${Date.now()}`,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        description: description.trim(),
        createdAt: editingId ? selectedContact?.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      let updatedContacts;
      if (editingId) {
        updatedContacts = contacts.map(c => c.id === editingId ? newContact : c);
      } else {
        updatedContacts = [...contacts, newContact];
      }

      const success = await saveContacts(updatedContacts);
      if (success) {
        setModalVisible(false);
        resetForm();
        Alert.alert('Success', editingId ? 'Contact updated successfully' : 'Contact added successfully');
      }
    } catch (error) {
      console.error('Error adding contact:', error);
      Alert.alert('Error', 'Failed to add contact');
    } finally {
      setSaving(false);
    }
  };

  const handleEditContact = (contact) => {
    setEditingId(contact.id);
    setName(contact.name);
    setEmail(contact.email);
    setPhone(contact.phone);
    setDescription(contact.description || '');
    setSelectedContact(contact);
    setViewModalVisible(false);
    setModalVisible(true);
  };

  const handleDeleteContact = (contactId) => {
    Alert.alert(
      'Delete Contact',
      'Are you sure you want to remove this trusted contact?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updatedContacts = contacts.filter(c => c.id !== contactId);
            const success = await saveContacts(updatedContacts);
            if (success) {
              setViewModalVisible(false);
              Alert.alert('Success', 'Contact removed successfully');
            }
          },
        },
      ]
    );
  };

  const resetForm = () => {
    setName('');
    setEmail('');
    setPhone('');
    setDescription('');
    setEditingId(null);
    setSelectedContact(null);
  };

  const openAddContactModal = () => {
    resetForm();
    setModalVisible(true);
  };

  const getFilteredAndSortedContacts = () => {
    let filtered = contacts.filter(contact =>
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.phone.includes(searchQuery)
    );

    switch (sortOrder) {
      case 'a-z':
        return filtered.sort((a, b) => a.name.localeCompare(b.name));
      case 'z-a':
        return filtered.sort((a, b) => b.name.localeCompare(a.name));
      case 'oldest':
        return filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      case 'newest':
      default:
        return filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
  };

  const renderContactCard = (contact) => (
    <TouchableOpacity
      key={contact.id}
      style={styles.contactCard}
      onPress={() => {
        setSelectedContact(contact);
        setViewModalVisible(true);
      }}
      activeOpacity={0.7}
    >
      <View style={styles.contactAvatar}>
        <Text style={styles.contactAvatarText}>
          {contact.name.charAt(0).toUpperCase()}
        </Text>
      </View>
      
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{contact.name}</Text>
        <View style={styles.contactDetail}>
          <Ionicons name="call-outline" size={14} color={COLORS.textSecondary} />
          <Text style={styles.contactDetailText}>+27 {contact.phone}</Text>
        </View>
        <View style={styles.contactDetail}>
          <Ionicons name="mail-outline" size={14} color={COLORS.textSecondary} />
          <Text style={styles.contactDetailText} numberOfLines={1}>
            {contact.email}
          </Text>
        </View>
      </View>

      <View style={styles.contactActions}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={(e) => {
            e.stopPropagation();
            handleEditContact(contact);
          }}
        >
          <Ionicons name="create-outline" size={20} color={COLORS.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={(e) => {
            e.stopPropagation();
            handleDeleteContact(contact.id);
          }}
        >
          <Ionicons name="trash-outline" size={20} color={COLORS.error} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderSecurityCard = (service) => (
    <TouchableOpacity
      key={service.id}
      style={[
        styles.securityCard,
        selectedSecurity === service.id && styles.securityCardSelected
      ]}
      onPress={() => {
        setSelectedSecurity(service.id);
        setSecurityModalVisible(true);
      }}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={[service.color, `${service.color}CC`]}
        style={styles.securityGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.securityHeader}>
          <View style={styles.securityIconWrapper}>
            <MaterialCommunityIcons name={service.icon} size={32} color={COLORS.white} />
          </View>
          {service.isPro && (
            <View style={styles.proBadge}>
              <Text style={styles.proText}>PRO</Text>
            </View>
          )}
        </View>

        <Text style={styles.securityName}>{service.name}</Text>
        <Text style={styles.securityDescription}>{service.description}</Text>

        <View style={styles.securityFeatures}>
          {service.features.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={14} color="rgba(255,255,255,0.9)" />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        <View style={styles.securityFooter}>
          <View style={styles.phoneContainer}>
            <Ionicons name="call" size={16} color={COLORS.white} />
            <Text style={styles.phoneText}>{service.phone}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.white} />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderContactsTab = () => (
    <View style={styles.tabContent}>
      {/* Search and Filter */}
      <View style={styles.filtersContainer}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={COLORS.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search contacts..."
            placeholderTextColor={COLORS.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={COLORS.textTertiary} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.sortContainer}>
          <TouchableOpacity
            style={[styles.sortButton, sortOrder === 'a-z' && styles.sortButtonActive]}
            onPress={() => setSortOrder('a-z')}
          >
            <MaterialCommunityIcons 
              name="sort-alphabetical-ascending" 
              size={18} 
              color={sortOrder === 'a-z' ? COLORS.white : COLORS.textSecondary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortButton, sortOrder === 'z-a' && styles.sortButtonActive]}
            onPress={() => setSortOrder('z-a')}
          >
            <MaterialCommunityIcons 
              name="sort-alphabetical-descending" 
              size={18} 
              color={sortOrder === 'z-a' ? COLORS.white : COLORS.textSecondary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortButton, sortOrder === 'newest' && styles.sortButtonActive]}
            onPress={() => setSortOrder('newest')}
          >
            <MaterialCommunityIcons 
              name="sort-clock-descending" 
              size={18} 
              color={sortOrder === 'newest' ? COLORS.white : COLORS.textSecondary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortButton, sortOrder === 'oldest' && styles.sortButtonActive]}
            onPress={() => setSortOrder('oldest')}
          >
            <MaterialCommunityIcons 
              name="sort-clock-ascending" 
              size={18} 
              color={sortOrder === 'oldest' ? COLORS.white : COLORS.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Contacts Count */}
      <View style={styles.countContainer}>
        <Text style={styles.countText}>
          {contacts.length} of {MAX_CONTACTS} contacts
        </Text>
      </View>

      {/* Contacts List */}
      <ScrollView 
        style={styles.contactsList}
        contentContainerStyle={styles.contactsListContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.emptyContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : getFilteredAndSortedContacts().length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrapper}>
              <Ionicons name="people-outline" size={64} color={COLORS.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'No contacts found' : 'No Trusted Contacts'}
            </Text>
            <Text style={styles.emptyText}>
              {searchQuery 
                ? 'Try adjusting your search'
                : 'Add trusted contacts who will be notified in case of emergency'
              }
            </Text>
          </View>
        ) : (
          getFilteredAndSortedContacts().map(renderContactCard)
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Add Button */}
      {contacts.length < MAX_CONTACTS && (
        <TouchableOpacity 
          style={styles.addButton}
          onPress={openAddContactModal}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryDark]}
            style={styles.addButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="add" size={24} color={COLORS.white} />
            <Text style={styles.addButtonText}>Add Trusted Contact</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderEmergencyTab = () => (
    <ScrollView 
      style={styles.tabContent}
      contentContainerStyle={styles.emergencyContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Free Emergency Section */}
      <View style={styles.emergencySection}>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="phone-alert" size={24} color={COLORS.error} />
          <Text style={styles.sectionTitle}>Free Emergency Services</Text>
        </View>
        <Text style={styles.sectionDescription}>
          Direct access to South African Police Service (SAPS) emergency line. Available 24/7 for immediate assistance.
        </Text>

        <TouchableOpacity style={styles.policeCard} activeOpacity={0.8}>
          <LinearGradient
            colors={['#1E40AF', '#1E3A8A']}
            style={styles.policeGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.policeHeader}>
              <View style={styles.policeIconWrapper}>
                <MaterialCommunityIcons name="police-badge" size={40} color={COLORS.white} />
              </View>
              <View style={styles.freeBadge}>
                <Text style={styles.freeText}>FREE</Text>
              </View>
            </View>

            <Text style={styles.policeName}>SAPS Emergency</Text>
            <Text style={styles.policeDescription}>
              South African Police Service
            </Text>

            <View style={styles.policeFeatures}>
              <View style={styles.policeFeature}>
                <Ionicons name="time-outline" size={16} color="rgba(255,255,255,0.9)" />
                <Text style={styles.policeFeatureText}>24/7 Available</Text>
              </View>
              <View style={styles.policeFeature}>
                <Ionicons name="location-outline" size={16} color="rgba(255,255,255,0.9)" />
                <Text style={styles.policeFeatureText}>Nationwide Coverage</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.callButton}>
              <Ionicons name="call" size={20} color={COLORS.white} />
              <Text style={styles.callButtonText}>Call 10111</Text>
            </TouchableOpacity>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Premium Security Section */}
      <View style={styles.emergencySection}>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="shield-crown" size={24} color={COLORS.primary} />
          <Text style={styles.sectionTitle}>Premium Security Partners</Text>
          <View style={styles.proChip}>
            <Text style={styles.proChipText}>PRO</Text>
          </View>
        </View>
        <Text style={styles.sectionDescription}>
          Select one partnered security company for enhanced protection with faster response times and armed response units.
        </Text>

        <View style={styles.securityGrid}>
          {securityServices.map(renderSecurityCard)}
        </View>
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Trusted Contacts</Text>
            <Text style={styles.headerSubtitle}>
              {activeTab === 'contacts' 
                ? 'Manage your emergency contacts'
                : 'Access emergency services'
              }
            </Text>
          </View>
          <View style={styles.shieldIcon}>
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              style={styles.shieldGradient}
            >
              <MaterialCommunityIcons name="shield-account" size={28} color={COLORS.white} />
            </LinearGradient>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'contacts' && styles.tabActive]}
            onPress={() => setActiveTab('contacts')}
          >
            <Ionicons 
              name={activeTab === 'contacts' ? 'people' : 'people-outline'} 
              size={20} 
              color={activeTab === 'contacts' ? COLORS.primary : COLORS.textSecondary}
            />
            <Text style={[styles.tabText, activeTab === 'contacts' && styles.tabTextActive]}>
              Contacts
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'emergency' && styles.tabActive]}
            onPress={() => setActiveTab('emergency')}
          >
            <MaterialCommunityIcons 
              name={activeTab === 'emergency' ? 'shield-alert' : 'shield-alert-outline'} 
              size={20} 
              color={activeTab === 'emergency' ? COLORS.primary : COLORS.textSecondary}
            />
            <Text style={[styles.tabText, activeTab === 'emergency' && styles.tabTextActive]}>
              Emergency Services
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      {activeTab === 'contacts' ? renderContactsTab() : renderEmergencyTab()}

      {/* Add/Edit Contact Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(false);
          resetForm();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingId ? 'Edit Contact' : 'Add Trusted Contact'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  resetForm();
                }}
              >
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter full name"
                  placeholderTextColor={COLORS.textTertiary}
                  value={name}
                  onChangeText={setName}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="email@example.com"
                  placeholderTextColor={COLORS.textTertiary}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone Number *</Text>
                <View style={styles.phoneInputContainer}>
                  <View style={styles.countryCode}>
                    <Text style={styles.flagEmoji}>🇿🇦</Text>
                    <Text style={styles.countryCodeText}>+27</Text>
                  </View>
                  <TextInput
                    style={styles.phoneInput}
                    placeholder="123456789"
                    placeholderTextColor={COLORS.textTertiary}
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    maxLength={9}
                  />
                </View>
                <Text style={styles.inputHint}>Enter 9 digits only</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description (Optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Relationship, notes..."
                  placeholderTextColor={COLORS.textTertiary}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setModalVisible(false);
                    resetForm();
                  }}
                  disabled={saving}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={handleAddContact}
                  disabled={saving}
                >
                  <LinearGradient
                    colors={[COLORS.primary, COLORS.primaryDark]}
                    style={styles.saveButtonGradient}
                  >
                    {saving ? (
                      <ActivityIndicator color={COLORS.white} size="small" />
                    ) : (
                      <Text style={styles.saveButtonText}>
                        {editingId ? 'Update' : 'Add Contact'}
                      </Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* View Contact Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={viewModalVisible}
        onRequestClose={() => setViewModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.viewModalContent}>
            {selectedContact && (
              <>
                <View style={styles.viewContactHeader}>
                  <View style={styles.viewContactAvatar}>
                    <Text style={styles.viewContactAvatarText}>
                      {selectedContact.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.closeModalButton}
                    onPress={() => setViewModalVisible(false)}
                  >
                    <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.viewContactName}>{selectedContact.name}</Text>
                
                <View style={styles.viewContactDetails}>
                  <View style={styles.viewDetailRow}>
                    <Ionicons name="call" size={20} color={COLORS.primary} />
                    <Text style={styles.viewDetailText}>+27 {selectedContact.phone}</Text>
                  </View>
                  <View style={styles.viewDetailRow}>
                    <Ionicons name="mail" size={20} color={COLORS.primary} />
                    <Text style={styles.viewDetailText}>{selectedContact.email}</Text>
                  </View>
                  {selectedContact.description && (
                    <View style={styles.viewDetailRow}>
                      <Ionicons name="document-text" size={20} color={COLORS.primary} />
                      <Text style={styles.viewDetailText}>{selectedContact.description}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.viewContactActions}>
                  <TouchableOpacity
                    style={[styles.viewActionButton, styles.editActionButton]}
                    onPress={() => handleEditContact(selectedContact)}
                  >
                    <Ionicons name="create-outline" size={20} color={COLORS.white} />
                    <Text style={styles.viewActionText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.viewActionButton, styles.deleteActionButton]}
                    onPress={() => handleDeleteContact(selectedContact.id)}
                  >
                    <Ionicons name="trash-outline" size={20} color={COLORS.white} />
                    <Text style={styles.viewActionText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Security Service Detail Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={securityModalVisible}
        onRequestClose={() => setSecurityModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.securityModalContent}>
            {selectedSecurity && securityServices.find(s => s.id === selectedSecurity) && (() => {
              const service = securityServices.find(s => s.id === selectedSecurity);
              return (
                <>
                  <View style={styles.securityModalHeader}>
                    <TouchableOpacity
                      style={styles.closeModalButton}
                      onPress={() => setSecurityModalVisible(false)}
                    >
                      <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  <View style={[styles.securityModalIcon, { backgroundColor: `${service.color}20` }]}>
                    <MaterialCommunityIcons name={service.icon} size={48} color={service.color} />
                  </View>

                  <Text style={styles.securityModalName}>{service.name}</Text>
                  <Text style={styles.securityModalDescription}>{service.description}</Text>

                  <View style={styles.securityModalFeatures}>
                    <Text style={styles.securityModalFeaturesTitle}>Features & Benefits</Text>
                    {service.features.map((feature, index) => (
                      <View key={index} style={styles.securityModalFeature}>
                        <View style={[styles.featureBullet, { backgroundColor: service.color }]}>
                          <Ionicons name="checkmark" size={16} color={COLORS.white} />
                        </View>
                        <Text style={styles.securityModalFeatureText}>{feature}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.securityModalContact}>
                    <Text style={styles.securityModalContactTitle}>Emergency Contact</Text>
                    <View style={styles.securityModalPhone}>
                      <Ionicons name="call" size={20} color={service.color} />
                      <Text style={styles.securityModalPhoneText}>{service.phone}</Text>
                    </View>
                  </View>

                  <TouchableOpacity 
                    style={styles.selectServiceButton}
                    onPress={() => {
                      Alert.alert(
                        'Premium Feature',
                        `${service.name} is a premium partner service. Upgrade to SafeLink Pro to access this feature and get faster emergency response times.`,
                        [
                          { text: 'Maybe Later', style: 'cancel' },
                          { text: 'Upgrade to Pro', onPress: () => console.log('Upgrade') }
                        ]
                      );
                    }}
                  >
                    <LinearGradient
                      colors={[service.color, `${service.color}CC`]}
                      style={styles.selectServiceGradient}
                    >
                      <MaterialCommunityIcons name="crown" size={20} color={COLORS.white} />
                      <Text style={styles.selectServiceText}>Select This Service (Pro)</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary,
  },
  header: {
    backgroundColor: COLORS.background,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  shieldIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  shieldGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabs: {
    flexDirection: 'row',
    gap: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: COLORS.backgroundSecondary,
    gap: 8,
  },
  tabActive: {
    backgroundColor: `${COLORS.primary}15`,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.primary,
  },
  tabContent: {
    flex: 1,
  },
  
  // Filters
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  sortContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  sortButton: {
    width: 40,
    height: 44,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortButtonActive: {
    backgroundColor: COLORS.primary,
  },
  countContainer: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  countText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  
  // Contacts List
  contactsList: {
    flex: 1,
  },
  contactsListContent: {
    paddingHorizontal: 20,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  contactAvatar: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: `${COLORS.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contactAvatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  contactDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  contactDetailText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  contactActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyIconWrapper: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  addButton: {
    position: 'absolute',
    bottom: 124,
    left: 20,
    right: 110,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  addButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
  
  // Emergency Tab
  emergencyContent: {
    padding: 20,
  },
  emergencySection: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    flex: 1,
  },
  proChip: {
    backgroundColor: `${COLORS.primary}20`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  proChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  sectionDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  
  // Police Card
  policeCard: {
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  policeGradient: {
    padding: 20,
  },
  policeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  policeIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  freeBadge: {
    backgroundColor: COLORS.success,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  freeText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  policeName: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.white,
    marginBottom: 4,
  },
  policeDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 16,
  },
  policeFeatures: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  policeFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  policeFeatureText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.95)',
    fontWeight: '600',
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  callButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
  
  // Security Cards
  securityGrid: {
    gap: 16,
  },
  securityCard: {
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  securityCardSelected: {
    transform: [{ scale: 0.98 }],
  },
  securityGradient: {
    padding: 20,
  },
  securityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  securityIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  proBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  proText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  securityName: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.white,
    marginBottom: 4,
  },
  securityDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 16,
  },
  securityFeatures: {
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  featureText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.95)',
    fontWeight: '500',
  },
  securityFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  phoneText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 20,
    maxHeight: '90%',
    marginBottom: 210,
    margin: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  modalForm: {
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  textArea: {
    height: 80,
    paddingTop: 16,
    textAlignVertical: 'top',
  },
  phoneInputContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  countryCode: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  flagEmoji: {
    fontSize: 20,
  },
  countryCodeText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  phoneInput: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputHint: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginTop: 4,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 20,
  },
  modalButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  cancelButton: {
    backgroundColor: COLORS.backgroundSecondary,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  saveButton: {
  },
  saveButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
  
  // View Contact Modal
  viewModalContent: {
    backgroundColor: COLORS.background,
    borderRadius: 24,
    padding: 24,
    margin: 20,
    maxHeight: '80%',
    marginBottom: 260,
  },
  viewContactHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  viewContactAvatar: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: `${COLORS.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  viewContactAvatarText: {
    fontSize: 36,
    fontWeight: '700',
    color: COLORS.primary,
  },
  closeModalButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    padding: 4,
  },
  viewContactName: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 24,
  },
  viewContactDetails: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  viewDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  viewDetailText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  viewContactActions: {
    flexDirection: 'row',
    gap: 12,
  },
  viewActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 6,
  },
  editActionButton: {
    backgroundColor: COLORS.primary,
  },
  deleteActionButton: {
    backgroundColor: COLORS.error,
  },
  viewActionText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
  },
  
  // Security Detail Modal
  securityModalContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
    marginBottom: 180,
    margin: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  securityModalHeader: {
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  securityModalIcon: {
    width: 96,
    height: 96,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  securityModalName: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  securityModalDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  securityModalFeatures: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  securityModalFeaturesTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  securityModalFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  featureBullet: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityModalFeatureText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  securityModalContact: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  securityModalContactTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  securityModalPhone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  securityModalPhoneText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  selectServiceButton: {
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  selectServiceGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  selectServiceText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
});