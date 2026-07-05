# Orders Presentation

Orders admin and storefront presentation code should migrate here incrementally.

Legacy admin orders shims under the former `src/components/admin/orders/**` namespace have been removed. Order-item detail and refund-order presentation now live directly under module-owned slices and should be consumed from `src/modules/orders/presentation/admin/**`.
