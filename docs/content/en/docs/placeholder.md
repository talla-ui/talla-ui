---
title: API Reference
abstract: Complete API reference for the Tälla UI framework.
---

# API Reference

## Core

- {@link app} +
- {@link AppContext} +
- {@link AppQueue} +
- {@link AppException} +
- {@link LogWriter} +

## Activities and navigation

- {@link Activity} +
- {@link ActivityRouter} +
- {@link NavigationContext} +
- {@link Viewport} +

## Views

- {@link View} +
- {@link ViewBuilder} +
- {@link ViewBuilderFunction} +
- {@link ViewBuilderEventHandler} +
- {@link ViewEvent} +
- {@link Widget} +

## UI elements

- {@link UI} +
- {@link UIElement} +
- {@link UIButton} +
- {@link UIText} +
- {@link UITextField} +
- {@link UIToggle} +
- {@link UIImage} +
- {@link UIColumn} +
- {@link UIRow} +
- {@link UIContainer} +
- {@link UIScrollView} +
- {@link UIListView} +
- {@link UIListViewEvent} +
- {@link UIShowView} +
- {@link UIDivider} +
- {@link UISpacer} +
- {@link UIIconResource} +

## Styling

- {@link UIColor} +
- {@link StyleOverrides} +

## State and binding

- {@link ObservableObject} +
- {@link ObservableList} +
- {@link ObservableEvent} +
- {@link Binding} +
- {@link BindingOrValue} +

## Forms

- {@link FormState} +
- {@link Schema} +

## Rendering

- {@link RenderContext} +
- {@link RenderEffect} +
- {@link ModalFactory} +
- {@link MessageDialogOptions} +
- {@link ModalMenuOptions} +

## Internationalization

- {@link I18nContext} +
- {@link DeferredString} +
- {@link StringConvertible} +
- {@link fmt} +

## Web handler

- {@link useWebContext} +
- {@link WebContextOptions} +
- {@link WebRenderer} +
- {@link WebNavigationContext} +
- {@link WebTheme} +
- {@link setWebTheme} +
- {@link WebModalViews} +
- {@link useAnimationEffects} +
- {@link useContainerEffects} +
- {@link useDragEffects} +

## Test handler

- {@link useTestContext} +
- {@link TestContextOptions} +
- {@link TestAppContext} +
- {@link TestRenderer} +
- {@link TestNavigationContext} +
- {@link TestOutputElement} +
- {@link renderTestView} +
- {@link expectOutput} +
- {@link expectOutputAsync} +
- {@link expectNavAsync} +
- {@link ExpectNavOptions} +
- {@link expectMessageDialogAsync} +
- {@link RenderedTestMessageDialog} +
- {@link OutputAssertion} +
- {@link OutputSelectFilter} +
- {@link clickOutputAsync} +
- {@link enterTextOutputAsync} +
