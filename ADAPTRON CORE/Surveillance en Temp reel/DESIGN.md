---
name: Adaptron Core
colors:
  surface: '#101415'
  surface-dim: '#101415'
  surface-bright: '#363a3b'
  surface-container-lowest: '#0b0f10'
  surface-container-low: '#191c1e'
  surface-container: '#1d2022'
  surface-container-high: '#272a2c'
  surface-container-highest: '#323537'
  on-surface: '#e0e3e5'
  on-surface-variant: '#c4c6d0'
  inverse-surface: '#e0e3e5'
  inverse-on-surface: '#2d3133'
  outline: '#8e9099'
  outline-variant: '#43474e'
  surface-tint: '#adc7f8'
  primary: '#adc7f8'
  on-primary: '#123059'
  primary-container: '#00234b'
  on-primary-container: '#718bb9'
  inverse-primary: '#455f8a'
  secondary: '#ffb68b'
  on-secondary: '#522300'
  secondary-container: '#ff7f1c'
  on-secondary-container: '#602a00'
  tertiary: '#8bceff'
  on-tertiary: '#00344e'
  tertiary-container: '#00263b'
  on-tertiary-container: '#0093d3'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#d6e3ff'
  primary-fixed-dim: '#adc7f8'
  on-primary-fixed: '#001b3d'
  on-primary-fixed-variant: '#2c4771'
  secondary-fixed: '#ffdbc8'
  secondary-fixed-dim: '#ffb68b'
  on-secondary-fixed: '#321200'
  on-secondary-fixed-variant: '#753400'
  tertiary-fixed: '#c9e6ff'
  tertiary-fixed-dim: '#8bceff'
  on-tertiary-fixed: '#001e2f'
  on-tertiary-fixed-variant: '#004b6f'
  background: '#101415'
  on-background: '#e0e3e5'
  surface-variant: '#323537'
typography:
  h1:
    fontFamily: Space Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  h2:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  h3:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: '0'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-caps:
    fontFamily: Space Grotesk
    fontSize: 12px
    fontWeight: '700'
    lineHeight: '1'
    letterSpacing: 0.1em
  mono-data:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1'
    letterSpacing: -0.01em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  xxl: 64px
  gutter: 24px
  margin: 32px
---

## Brand & Style

The design system is engineered to project a sense of industrial precision and high-tech efficiency. It serves a dual audience of field engineers and energy analysts who require immediate clarity and data density. 

The aesthetic is a hybrid of **Modern Corporate** and **Technical Industrial**. It leverages high-contrast interfaces and sharp, purposeful lines to evoke the feeling of a sophisticated control room. The brand personality is authoritative and reliable, emphasizing real-time responsiveness and the "active" nature of energy management. Visual interest is generated through subtle data-inspired motifs—such as grid overlays and hairline strokes—rather than decorative fluff.

## Colors

The color palette is rooted in a "Deep Tech" foundation. The primary color is a heavy, industrial navy, used to ground the interface in reliability. The secondary "Electric Orange" is reserved for active states, critical alerts, and primary calls to action, mirroring the energy flow in the logo.

This design system defaults to a **Dark Mode** to reduce eye strain in monitoring environments and to make data visualizations pop. A high-contrast light mode is available for administrative and reporting tasks. The tertiary sky blue is used exclusively for "active" indicators, such as moving energy currents or progress bars, providing a technical contrast to the heat of the orange.

## Typography

The typography strategy balances futuristic character with extreme legibility. **Space Grotesk** is used for headlines and labels; its geometric, slightly eccentric forms give the interface its cutting-edge "energy tech" feel. 

**Inter** is utilized for all body copy and data tables. It is chosen for its neutral, utilitarian performance, ensuring that complex energy metrics remain readable at small sizes. For numerical data points and live meter readings, a medium weight of Inter is used to maintain a consistent horizontal rhythm, mimicking a monospaced feel without sacrificing the elegance of a proportional sans-serif.

## Layout & Spacing

This design system employs a **12-column fluid grid** for dashboard views and a **fixed-center grid** for technical documentation. The spacing rhythm is based on a **4px baseline**, ensuring that even the most data-dense layouts maintain mathematical alignment.

Layouts should prioritize "Information Density." Rather than expansive whitespace, the system uses clear structural divisions. Modules are separated by 24px gutters to allow for complex data visualizations to sit side-by-side without visual bleed. Margin areas are kept generous at 32px to frame the "control center" feel of the central content.

## Elevation & Depth

Hierarchy is established through **Tonal Layering** rather than traditional drop shadows. In the default dark mode, the background uses the deepest navy, while "Surface" containers use a slightly lighter, desaturated blue. 

To evoke a high-tech hardware feel, this design system uses **low-contrast outlines**. Instead of shadows, surfaces are defined by 1px "hairline" borders in a semi-transparent white (10-15% opacity). This creates a crisp, architectural look. For critical interactive elements, a subtle "inner glow" or "rim light" effect using the secondary Electric Orange may be used to signify focus or an "on" state, mimicking physical LED indicators on industrial hardware.

## Shapes

The shape language is disciplined and industrial. Elements use a **Soft (0.25rem)** corner radius as the standard. This small radius provides a hint of modern refinement while maintaining the structural rigidity of a technical tool.

Sharp (0px) corners are used for data bars and decorative grid lines to emphasize precision. Pill-shapes are avoided except for status chips, where they provide a necessary visual break from the otherwise rectangular, grid-locked interface.

## Components

### Buttons
Primary buttons utilize the Electric Orange background with white text. They should have a subtle "active pulse" animation on hover. Secondary buttons use the ghost style with a 1px deep tech blue border.

### Inputs & Form Fields
Fields are dark-themed with a subtle 1px border. On focus, the border transitions to Electric Orange. Labels use the `label-caps` typography style, positioned strictly above the input.

### Cards & Containers
Containers are the "workhorses" of this system. They should have a header area defined by a hairline divider. For live data cards, include a "Live" status dot in the top right corner that pulses in Sky Blue.

### Data Visualization
Charts should use a limited palette: Sky Blue for current data, Deep Blue for historical benchmarks, and Electric Orange for thresholds or targets. Use thin line weights (1px to 1.5px) for line graphs to maintain the industrial aesthetic.

### Additional Components: "The Energy Gauge"
A custom radial or linear gauge component is required to visualize active load. It should use segmented bars rather than a continuous fill to mimic digital hardware readouts.