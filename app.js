import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// API Kimlik Bilgilerin Doğrudan Tanımlandı
const SUPABASE_URL = 'https://ybcjjqvachrxoambgffw.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_EZ7GEMU9xyuRyVJQrbn5lA_5h9jc3Al'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

let myChart = null; // Grafik hafızasını tutan değişken

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('user-role').innerText = "Rol: Admin (Yönetici)"
    
    // Açılışta tüm listeleri ve grafiği yükle
    urunleriListele()
    kutularıListele()
    satıslarıListele()
    grafikGuncelle()

    // Form tetikleyicileri
    document.getElementById('product-form').addEventListener('submit', urunEkle)
    document.getElementById('box-form').addEventListener('submit', kutuEkle)
    document.getElementById('sale-form').addEventListener('submit', satısYap)
})

// [FONKSİYON 1] Ürünleri Listeler
async function urunleriListele() {
    const tableBody = document.getElementById('product-table-body')
    const { data: urunler } = await supabase.from('products').select('*')
    tableBody.innerHTML = ''
    if (!urunler || urunler.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4" class="p-3 text-center text-gray-400">Henüz ürün eklenmemiş.</td></tr>`
        return
    }
    urunler.forEach(urun => {
        tableBody.innerHTML += `
            <tr class="border-b hover:bg-gray-50">
                <td class="p-3 font-bold text-gray-500">#${urun.id}</td>
                <td class="p-3 font-semibold text-gray-800">${urun.title}</td>
                <td class="p-3 font-mono text-blue-600">${urun.item_no}</td>
                <td class="p-3 text-gray-500">${urun.barcode}</td>
            </tr>`
    })
    document.getElementById('total-products').innerText = urunler.length
}

// [FONKSİYON 2] Ürün Ekle
async function urunEkle(event) {
    event.preventDefault()
    const title = document.getElementById('prod-title').value
    const item_no = document.getElementById('prod-item-no').value
    const barcode = document.getElementById('prod-barcode').value

    await supabase.from('products').insert([{ title, item_no, barcode }])
    document.getElementById('product-form').reset()
    urunleriListele()
}

// [FONKSİYON 3] Kutuları / Stokları Listeler
async function kutularıListele() {
    try {
        const tableBody = document.getElementById('box-table-body')
        if (!tableBody) return;

        const { data: kutular, error } = await supabase.from('boxes').select('*')
        
        if (error) {
            console.error('Kutular çekilirken Supabase hatası:', error)
            tableBody.innerHTML = `<tr><td colspan="3" class="p-3 text-center text-red-500">Hata: ${error.message}</td></tr>`
            return
        }

        tableBody.innerHTML = ''
        if (!kutular || kutular.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="3" class="p-3 text-center text-gray-400">Henüz stok yok.</td></tr>`
            document.getElementById('total-stock').innerText = 0
            return
        }
        let toplamStok = 0
        kutular.forEach(kutu => {
            toplamStok += Number(kutu.quantity)
            tableBody.innerHTML += `
                <tr class="border-b hover:bg-gray-50">
                    <td class="p-3 font-mono text-green-600 font-bold">${kutu.box_number}</td>
                    <td class="p-3">Ürün #${kutu.product_id}</td>
                    <td class="p-3 font-semibold">${kutu.quantity} Adet</td>
                </tr>`
        })
        document.getElementById('total-stock').innerText = toplamStok
    } catch (err) {
        console.error('Kutular listelenirken sistem çöktü:', err)
    }
}

// [FONKSİYON 4] Stok / Kutu Ekle
async function kutuEkle(event) {
    event.preventDefault()
    const box_number = document.getElementById('box-number').value
    const product_id = document.getElementById('box-product-id').value
    const quantity = document.getElementById('box-quantity').value

    await supabase.from('boxes').insert([{ box_number, product_id, quantity }])
    document.getElementById('box-form').reset()
    kutularıListele()
}

// [FONKSİYON 5] Satış Yapınca Stoktan Otomatik Düşen Mekanizma
async function satısYap(event) {
    event.preventDefault()

    const prodId = document.getElementById('sale-product-id').value
    const boxNo = document.getElementById('sale-box-number').value
    const miktar = Number(document.getElementById('sale-quantity').value)
    const platform = document.getElementById('sale-marketplace').value

    const { data: kutu, error: kutuError } = await supabase
        .from('boxes')
        .select('*')
        .eq('box_number', boxNo)
        .eq('product_id', prodId)
        .single()

    if (kutuError || !kutu) {
        alert("Hata: Depoda bu kutuda, bu ID'ye ait ürün bulunamadı!")
        return
    }

    if (Number(kutu.quantity) < miktar) {
        alert(`Yetersiz Stok! Bu kutuda sadece ${kutu.quantity} adet ürün var. İstediğiniz: ${miktar}`)
        return
    }

    const yeniAdet = Number(kutu.quantity) - miktar
    await supabase
        .from('boxes')
        .update({ quantity: yeniAdet })
        .eq('id', kutu.id)

    await supabase
        .from('sales')
        .insert([{ product_id: prodId, box_number: boxNo, quantity: miktar, marketplace: platform }])

    alert(`Satış Başarılı! Stoktan ${miktar} adet düşüldü.`)
    document.getElementById('sale-form').reset()
    
    kutularıListele()
    satıslarıListele()
    grafikGuncelle() // Satış olunca grafiği yenile
}

// [FONKSİYON 6] Satış Geçmişini Listeler
async function satıslarıListele() {
    try {
        const tableBody = document.getElementById('sales-table-body')
        if (!tableBody) return;

        const { data: satıslar, error } = await supabase.from('sales').select('*')
        
        if (error) {
            console.error('Satışlar çekilirken Supabase hatası:', error)
            tableBody.innerHTML = `<tr><td colspan="4" class="p-3 text-center text-red-500">Hata: ${error.message}</td></tr>`
            return
        }

        tableBody.innerHTML = ''
        if (!satıslar || satıslar.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="4" class="p-3 text-center text-gray-400">Henüz satış yapılmamış.</td></tr>`
            document.getElementById('total-sales').innerText = 0
            return
        }

        let toplamSatılan = 0
        satıslar.forEach(satıs => {
            toplamSatılan += Number(satıs.quantity)
            tableBody.innerHTML += `
                <tr class="border-b hover:bg-purple-50">
                    <td class="p-3">Ürün #${satıs.product_id}</td>
                    <td class="p-3 font-mono">${satıs.box_number}</td>
                    <td class="p-3 font-bold text-purple-600">${satıs.quantity} Adet</td>
                    <td class="p-3"><span class="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded font-semibold">${satıs.marketplace}</span></td>
                </tr>`
        })
        document.getElementById('total-sales').innerText = toplamSatılan
    } catch (err) {
        console.error('Satışlar listelenirken sistem çöktü:', err)
    }
}

// [FONKSİYON 7] Depodaki Ürünleri Excel (CSV) Yapıp Kesin Olarak İndirir
async function excelIndir() {
    const { data: urunler } = await supabase
        .from('products')
        .select('id, title, item_no, barcode')

    if (!urunler || urunler.length === 0) {
        alert('İndirilecek hiç ürün bulunamadı!')
        return
    }

    let csvIcerik = "\uFEFF";
    csvIcerik += "Ürün ID;Ürün Adı;Ürün Kodu (Item No);Barkod Numarası\n";

    urunler.forEach(urun => {
        csvIcerik += `${urun.id};${urun.title};${urun.item_no};${urun.barcode}\n`;
    })

    const blob = new Blob([csvIcerik], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", "CloudStock_Stok_Raporu.csv")
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
}

// [FONKSİYON 8] Satış Verilerini Pasta Grafiği Yapar
// [FONKSİYON 8] Satış Verilerini Pasta Grafiği Yapar (Boş Durum Korumalı)
async function grafikGuncelle() {
    const { data: satıslar } = await supabase.from('sales').select('marketplace, quantity')
    
    let trendyolToplam = 0
    let amazonToplam = 0
    let hepsiburadaToplam = 0

    if (satıslar) {
        satıslar.forEach(satıs => {
            if (satıs.marketplace === 'Trendyol') trendyolToplam += Number(satıs.quantity)
            if (satıs.marketplace === 'Amazon') amazonToplam += Number(satıs.quantity)
            if (satıs.marketplace === 'Hepsiburada') hepsiburadaToplam += Number(satıs.quantity)
        })
    }

    const ctx = document.getElementById('salesChart')
    if (!ctx) return;

    if (myChart) {
        myChart.destroy();
    }

    // EĞER HİÇ SATIŞ YOKSA: Ekranda şık bir gri halka göster
    const toplamSatıs = trendyolToplam + amazonToplam + hepsiburadaToplam;
    
    const chartData = toplamSatıs === 0 
        ? [1] // Boşken tek bir dilim oluştur
        : [trendyolToplam, amazonToplam, hepsiburadaToplam];

    const chartColors = toplamSatıs === 0
        ? ['#e5e7eb'] // Boşken açık gri renk yap
        : ['#f97316', '#cc0000', '#2563eb'];

    const chartLabels = toplamSatıs === 0
        ? ['Henüz Satış Yok']
        : ['Trendyol', 'Amazon', 'Hepsiburada'];

    myChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: chartLabels,
            datasets: [{
                data: chartData,
                backgroundColor: chartColors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    })
}

// SÜPER TETİKLEYİCİ: Global tıklamaları dinler, engelleri aşar
document.addEventListener('click', function(e) {
    if(e.target && e.target.id === 'btn-export-excel') {
        excelIndir();
    }
});