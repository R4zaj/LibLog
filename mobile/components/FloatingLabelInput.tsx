import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleProp,
  StyleSheet,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';

interface FloatingLabelInputProps extends TextInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  rightElement?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
}

/**
 * Rounded text input with an in-box floating label that rises into the top
 * of the container when focused or populated, paired with a light outline.
 */
export default function FloatingLabelInput({
  label,
  value,
  onChangeText,
  rightElement,
  containerStyle,
  onFocus,
  onBlur,
  style,
  ...rest
}: FloatingLabelInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const isActive = isFocused || value.length > 0;
  const animatedValue = useRef(new Animated.Value(isActive ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: isActive ? 1 : 0,
      duration: 160,
      useNativeDriver: false,
    }).start();
  }, [isActive, animatedValue]);

  const labelTop = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [19, 8],
  });

  const labelFontSize = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [16, 12],
  });

  return (
    <Pressable
      onPress={() => inputRef.current?.focus()}
      style={[
        styles.container,
        isFocused ? styles.containerFocused : styles.containerUnfocused,
        containerStyle,
      ]}
    >
      <View style={styles.inputWrapper}>
        <Animated.Text
          pointerEvents="none"
          numberOfLines={1}
          style={[
            styles.label,
            {
              top: labelTop,
              fontSize: labelFontSize,
            },
          ]}
        >
          {label}
        </Animated.Text>
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          style={[
            styles.input,
            rightElement ? styles.inputWithRight : undefined,
            style,
          ]}
          {...rest}
        />
      </View>
      {rightElement ? <View style={styles.rightContainer}>{rightElement}</View> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 60,
    borderRadius: 16,
    borderWidth: 1.2,
    backgroundColor: '#ffffff',
    marginBottom: 16,
  },
  containerUnfocused: {
    borderColor: '#cbd5e1',
  },
  containerFocused: {
    borderColor: '#94a3b8',
  },
  inputWrapper: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
  },
  label: {
    position: 'absolute',
    left: 16,
    right: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  input: {
    flex: 1,
    height: '100%',
    paddingTop: 22,
    paddingBottom: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#1e1e2e',
  },
  inputWithRight: {
    paddingRight: 4,
  },
  rightContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingRight: 4,
  },
});

